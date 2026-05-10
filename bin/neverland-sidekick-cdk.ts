#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { VedustSeeker } from "../lib/vedustSeeker";
import { Vpc } from "../lib/vpcStack";

const env: cdk.Environment = {
  region: "us-east-1",
};

const app = new cdk.App();

const vpcStack = new Vpc(app, "NeverlandSidekickVpc", { env });

const vedustSeekerStack = new VedustSeeker(app, "VedustSeeker", {
  env,
  tableName: "voting-escrow-dust",
  vpc: vpcStack.vpc,
  subnets: vpcStack.getLambdaSubnetSelection(),
});
