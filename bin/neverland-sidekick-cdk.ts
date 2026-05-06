#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { VedustSeeker } from "../lib/vedustSeeker";

const env: cdk.Environment = {
  region: "us-east-1",
};

const app = new cdk.App();

const vedustSeekerStack = new VedustSeeker(app, "VedustSeeker", {
  env,
  tableName: "voting-escrow-dust",
});
