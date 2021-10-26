import * as cdk from "@aws-cdk/core";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import { LoadTestRunner } from "./load-test-runner";
import { LoadTestEngine } from "./load-test-engine";
import { LoadTestAPI } from "./load-test-api";

export class LoadTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const loadTestRunner = new LoadTestRunner(this, "loadTestRunner");
    // const loadTestEngine = new LoadTestEngine(
    //   this,
    //   "loadTestEngine",
    //   loadTestRunner
    // );

    new LoadTestAPI(this, "loadTestAPI");
  }
}
