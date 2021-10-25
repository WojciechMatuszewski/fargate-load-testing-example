import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2";
import * as apigw from "@aws-cdk/aws-apigateway";
import { join } from "path";

export class LoadTestAPI extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const dataTable = new dynamodb.Table(this, "dataTable", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const saveLoadTestDefinitionTask = new sfnTasks.DynamoPutItem(
      this,
      "saveLoadTestDefinitionTask",
      {
        item: {
          pk: sfnTasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$$.Execution.Id")
          ),
          status: sfnTasks.DynamoAttributeValue.fromString("SCHEDULED"),
          definition: sfnTasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$.definition")
          )
        },
        table: dataTable
      }
    );

    const APIMachine = new sfn.StateMachine(this, "APIMachine", {
      definition: saveLoadTestDefinitionTask,
      tracingEnabled: true
    });

    // TODO: Add logging so that we can debug things
    const API = new apigw.RestApi(this, "API2", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS
      }
    });

    const APIRole = new iam.Role(this, "APIRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        AllowSFNInvoke: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["states:StartExecution"],
              effect: iam.Effect.ALLOW,
              resources: [APIMachine.stateMachineArn]
            })
          ]
        })
      }
    });

    const createLoadTestDefinitionAPIResource = API.root.addResource("create");
    createLoadTestDefinitionAPIResource.addMethod(
      "POST",
      new apigw.Integration({
        type: apigw.IntegrationType.AWS,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
        options: {
          credentialsRole: APIRole,
          // requestParameters: {
          //   Input: "$request.body",
          //   StateMachineArn: APIMachine.stateMachineArn
          // },
          passthroughBehavior: apigw.PassthroughBehavior.NEVER,
          requestTemplates: {
            "application/json": `
              {
                "input": "{\\"actionType\\": "create", \\"data\\": $util.escapeJavaScript($input.json('$'))}",
                "stateMachineArn": "${APIMachine.stateMachineArn}"
              }
            `
          },
          integrationResponses: [
            {
              selectionPattern: "4\\d{2}",
              statusCode: "400",
              responseTemplates: {
                "application/json": `{
                    "error": "Bad input!"
                  }`
              }
            },
            {
              selectionPattern: "5\\d{2}",
              statusCode: "500",
              responseTemplates: {
                "application/json": "\"error\": $input.path('$.error')"
              }
            },
            {
              statusCode: "201",
              responseTemplates: {
                "application/json": `{"id": "$context.requestId"}`
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'"
              }
            }
          ]
        }
      }),
      {
        methodResponses: [
          {
            statusCode: "201",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true
            }
          }
        ]
      }
    );

    // const createLoadTestDefinitionAPIMethod = new apigw.CfnMethod(
    //   this,
    //   "createLoadTestDefinitionAPIMethod",
    //   {
    //     httpMethod: "POST",
    //     resourceId: createLoadTestDefinitionAPIResource.resourceId,
    //     restApiId: API.restApiId,
    //     integration: {
    //       connectionType: "INTERNET",
    //       type: "AWS",
    //       credentials: APIRole.roleArn,
    //       requestParameters: {},
    //       integrationHttpMethod: "POST",
    //       uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
    //       passthroughBehavior: apigw.PassthroughBehavior.NEVER,
    //       requestTemplates: {
    //         "application/json": `{
    //           "action": "create",
    //           "definition": "$input.body"
    //         }`
    //       },
    //       integrationResponses: [
    //         {
    //           statusCode: "201",
    //           responseTemplates: {
    //             "application/json": `{"id": "$context.requestId"}`
    //           },
    //           responseParameters: {
    //             "method.response.header.Access-Control-Allow-Methods":
    //               "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
    //             "method.response.header.Access-Control-Allow-Headers":
    //               "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
    //             "method.response.header.Access-Control-Allow-Origin": "'*'"
    //           }
    //         }
    //       ]
    //     },
    //     methodResponses: [
    //       {
    //         statusCode: "201",
    // responseParameters: {
    // "method.response.header.Access-Control-Allow-Origin": true,
    // "method.response.header.Access-Control-Allow-Methods": true,
    // "method.response.header.Access-Control-Allow-Headers": true
    //         }
    //       }
    //     ]
    //   }
    // );

    // const APISFNIntegration = new apigwv2.CfnIntegration(
    //   this,
    //   "APISFNIntegration",
    //   {
    //     apiId: API.apiId,
    //     integrationType: "AWS_PROXY",
    //     connectionType: apigwv2.HttpConnectionType.INTERNET,
    //     integrationSubtype: "StepFunctions-StartExecution",
    //     credentialsArn: APIRole.roleArn,
    //     requestParameters: {
    //       // Very limited, I cannot use `JSON.stringify` here?
    //       Input: "$request.body",
    //       StateMachineArn: APIMachine.stateMachineArn
    //     },
    //     payloadFormatVersion: "1.0"
    //     // Supported only by websocket APIS :C
    //     // requestTemplates: {},
    //     // It is not possible to transform the body of the request?
    //     // responseParameters: {}
    //   }
    // );

    // new apigwv2.CfnRoute(this, "createLoadTestDefinitionRoute", {
    //   apiId: API.apiId,
    //   routeKey: "POST /create",
    //   target: `integrations/${APISFNIntegration.ref}`
    // });
  }
}
