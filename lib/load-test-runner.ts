import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import { join } from "path";

export class LoadTestRunner extends cdk.NestedStack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    const defaultVPC = ec2.Vpc.fromLookup(this, "defaultVPC", {
      isDefault: true
    });

    const cluster = new ecs.Cluster(this, "cluster", { vpc: defaultVPC });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "taskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256
      }
    );

    taskDefinition.addContainer("runnerContainer", {
      image: ecs.ContainerImage.fromAsset(
        join(__dirname, "../src/load-tester")
      ),
      memoryLimitMiB: 512
    });
  }
}
