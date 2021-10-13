import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import { join } from "path";

export class LoadTestRunner extends cdk.Construct {
  public cluster: ecs.Cluster;
  public taskDefinition: ecs.TaskDefinition;
  public containerDefinition: ecs.ContainerDefinition;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const defaultVPC = ec2.Vpc.fromLookup(this, "defaultVPC", {
      isDefault: true
    });

    this.cluster = new ecs.Cluster(this, "cluster", { vpc: defaultVPC });

    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "taskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256
      }
    );

    this.containerDefinition = this.taskDefinition.addContainer(
      "runnerContainer",
      {
        image: ecs.ContainerImage.fromAsset(
          join(__dirname, "../src/load-test-engine")
        ),
        memoryLimitMiB: 512,
        logging: ecs.LogDriver.awsLogs({
          mode: ecs.AwsLogDriverMode.NON_BLOCKING,
          streamPrefix: "runner"
        })
      }
    );
  }
}
