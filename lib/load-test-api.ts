import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as cdk from "@aws-cdk/core";

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
            sfn.JsonPath.stringAt("$$.Execution.Name")
          ),
          status: sfnTasks.DynamoAttributeValue.fromString("SCHEDULED"),
          definition: sfnTasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("States.JsonToString($.definition)")
          )
        },
        table: dataTable,
        resultPath: sfn.JsonPath.DISCARD
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
    const loadTestDefinitionModel = new apigw.Model(
      this,
      "loadTestDefinitionModel",
      {
        restApi: API,
        schema: {
          type: apigw.JsonSchemaType.OBJECT,
          properties: {
            concurrency: {
              type: apigw.JsonSchemaType.NUMBER,
              minimum: 1
            },
            holdFor: {
              type: apigw.JsonSchemaType.STRING
            },
            rampUp: {
              type: apigw.JsonSchemaType.STRING
            },
            method: {
              type: apigw.JsonSchemaType.STRING,
              enum: ["GET"]
            },
            url: {
              type: apigw.JsonSchemaType.STRING
            }
          },
          required: ["concurrency", "holdFor", "rampUp", "method", "url"]
        },
        contentType: "application/json"
      }
    );

    new SFNIntegrationMethod(this, "createLoadTest", {
      requestTemplates: {
        "application/json": `{
          "input": "{\\"actionType\\": \\"create\\", \\"definition\\": $util.escapeJavaScript($input.json('$'))}",
          "stateMachineArn": "${APIMachine.stateMachineArn}"
        }`
      },
      responseTemplates: {
        "application/json": `{"id": "$context.requestId"}`
      },
      credentialsRole: APIRole,
      resource: createLoadTestDefinitionAPIResource,
      requestModels: {
        "application/json": loadTestDefinitionModel
      },
      requestValidator: new apigw.RequestValidator(
        this,
        "createLoadTestValidator",
        {
          restApi: API,
          validateRequestBody: true
        }
      )
    });

    // new SFNIntegrationMethod(this, "getLoadTest", {
    //   requestTemplates: {
    //     "application/json": `{
    //       "input": "{\\"actionType\\": \\"create\\", \\"definition\\": $util.escapeJavaScript($input.json('$'))}",
    //       "stateMachineArn": "${APIMachine.stateMachineArn}"
    //     }`
    //   },
    //   responseTemplates: {},
    //   credentialsRole: APIRole,
    //   resource: createLoadTestDefinitionAPIResource
    // });
  }
}

interface SFNIntegrationProps {
  requestTemplates: apigw.IntegrationOptions["requestTemplates"];
  responseTemplates: apigw.IntegrationResponse["responseTemplates"];
  credentialsRole: iam.IRole;
  resource: apigw.IResource;
  requestModels?: apigw.MethodOptions["requestModels"];
  requestValidator?: apigw.MethodOptions["requestValidator"];
}

class SFNIntegrationMethod extends apigw.Method {
  constructor(
    scope: cdk.Construct,
    id: string,
    {
      requestTemplates,
      responseTemplates,
      credentialsRole,
      resource,
      requestModels,
      requestValidator
    }: SFNIntegrationProps
  ) {
    super(scope, id, {
      httpMethod: "POST",
      resource,
      options: {
        requestModels,
        requestValidator,
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
      },
      integration: new apigw.Integration({
        type: apigw.IntegrationType.AWS,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
        options: {
          credentialsRole,
          passthroughBehavior: apigw.PassthroughBehavior.NEVER,
          // Mind the difference between this definition and the one in HTTP APIs.
          requestTemplates,
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
              responseTemplates: responseTemplates,
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
      })
    });
  }
}
