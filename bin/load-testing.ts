#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { LoadTestStack } from "../lib/load-test-stack";

const app = new cdk.App();
new LoadTestStack(app, "LoadTestingStack");
