import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import { join } from "path";

interface LoadTestEngineProps {
  cluster: ecs.Cluster;
  taskDefinition: ecs.TaskDefinition;
}

export class LoadTestEngine extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: LoadTestEngineProps) {
    super(scope, id);

    const runLoadTestTask = new sfnTasks.EcsRunTask(this, "runLoadTest", {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster: props.cluster,
      taskDefinition: props.taskDefinition,
      launchTarget: new sfnTasks.EcsFargateLaunchTarget(),
      /**
       * Required when run in the context of public-only VPC
       */
      assignPublicIp: true
    });

    const machineDefinition = runLoadTestTask.next(
      new sfn.Succeed(this, "End")
    );

    const machine = new sfn.StateMachine(this, "machine", {
      definition: machineDefinition
    });
  }
}
