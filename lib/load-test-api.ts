import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2";
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

    // TODO: Use the REST API version.
    // The HTTP API is missing to many features to make the API possible.

    const APIMachine = new sfn.StateMachine(this, "APIMachine", {
      definition: saveLoadTestDefinitionTask,
      tracingEnabled: true
    });

    const API = new apigwv2.HttpApi(this, "API", {
      createDefaultStage: true
    });

    // API.addRoutes({
    // })
    //

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

    const APISFNIntegration = new apigwv2.CfnIntegration(
      this,
      "APISFNIntegration",
      {
        apiId: API.apiId,
        integrationType: "AWS_PROXY",
        connectionType: apigwv2.HttpConnectionType.INTERNET,
        integrationSubtype: "StepFunctions-StartExecution",
        credentialsArn: APIRole.roleArn,
        requestParameters: {
          // Very limited, I cannot use `JSON.stringify` here?
          Input: "$request.body",
          StateMachineArn: APIMachine.stateMachineArn
        },
        payloadFormatVersion: "1.0"
        // Supported only by websocket APIS :C
        // requestTemplates: {},
        // It is not possible to transform the body of the request?
        // responseParameters: {}
      }
    );

    new apigwv2.CfnRoute(this, "createLoadTestDefinitionRoute", {
      apiId: API.apiId,
      routeKey: "POST /create",
      target: `integrations/${APISFNIntegration.ref}`
    });
  }
}
