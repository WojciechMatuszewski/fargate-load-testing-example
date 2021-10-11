import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import { LoadTestRunner } from "./load-test-runner";

export class LoadTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new LoadTestRunner(this, "loadTestRunner");
  }
}
