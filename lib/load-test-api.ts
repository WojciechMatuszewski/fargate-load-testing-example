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
import * as logs from "@aws-cdk/aws-logs";
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

    const API = new apigw.RestApi(this, "API", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS
      },
      deployOptions: {
        accessLogFormat: apigw.AccessLogFormat.clf(),
        tracingEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        accessLogDestination: new apigw.LogGroupLogDestination(
          new logs.LogGroup(this, "APIAccessLogs", {
            retention: logs.RetentionDays.ONE_DAY
          })
        )
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
          passthroughBehavior: apigw.PassthroughBehavior.NEVER,
          // Mind the difference between this definition and the one in HTTP APIs.
          requestTemplates: {
            "application/json": `{
                "input": "{\\"actionType\\": \\"create\\", \\"definition\\": $util.escapeJavaScript($input.json('$'))}",
                "stateMachineArn": "${APIMachine.stateMachineArn}"
              }`
          },
          integrationResponses: [
            {
              selectionPattern: "4\\d{2}",
              statusCode: "400",
              responseTemplates: {
                "application/json": `{
                    "message": "Malformed input"
                  }`
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'"
              }
            },
            {
              selectionPattern: "5\\d{2}",
              statusCode: "500",
              responseTemplates: {
                "application/json": `{
                  "message": "$input.path('$.errorMessage')"
                }`
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'"
              }
            },
            {
              selectionPattern: "2\\d{2}",
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
          },
          {
            statusCode: "400",
            responseModels: {
              "application/json": apigw.Model.ERROR_MODEL
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true
            }
          },
          {
            statusCode: "500",
            responseModels: {
              "application/json": apigw.Model.ERROR_MODEL
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true
            }
          }
        ]
      }
    );
  }
}
