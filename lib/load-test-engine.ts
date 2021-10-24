import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as iam from "@aws-cdk/aws-iam";
import { join } from "path";

interface LoadTestEngineProps {
  cluster: ecs.Cluster;
  taskDefinition: ecs.TaskDefinition;
  containerDefinition: ecs.ContainerDefinition;
}

export class LoadTestEngine extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: LoadTestEngineProps) {
    super(scope, id);

    const runLoadTestTask = new sfnTasks.EcsRunTask(this, "runLoadTest", {
      // Without `WAIT_FOR_TASK_TOKEN` I would not be able to send the response back
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      cluster: props.cluster,
      taskDefinition: props.taskDefinition,
      launchTarget: new sfnTasks.EcsFargateLaunchTarget(),
      /**
       * Required when run in the context of public-only VPC
       */
      assignPublicIp: true,
      containerOverrides: [
        {
          environment: [
            {
              name: "TASK_TOKEN",
              value: sfn.JsonPath.stringAt("$$.Task.Token")
            },
            {
              name: "EXECUTION_ID",
              value: sfn.JsonPath.stringAt("$$.Execution.Id")
            }
          ],
          containerDefinition: props.containerDefinition
        }
      ]
    });

    const machineDefinition = runLoadTestTask.next(
      new sfn.Succeed(this, "End")
    );

    const machine = new sfn.StateMachine(this, "machine", {
      definition: machineDefinition
    });

    props.taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        actions: ["states:SendTaskSuccess", "states:SendTaskFailure"],
        resources: [machine.stateMachineArn]
      })
    );
  }
}
