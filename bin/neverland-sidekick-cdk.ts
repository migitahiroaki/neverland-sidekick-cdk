#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { VedustSeeker } from "../lib/vedustSeeker";
import { Vpc } from "../lib/vpcStack";
import { Notifier } from "../lib/notifier";

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

const app = new cdk.App();

const vpcStack = new Vpc(app, "NeverlandSidekickVpc", { env });

const notifierStack = new Notifier(app, "Notifier", {
  env,
  ssmDiscordWebhookUrl: "/Notifier/DiscordWebhookUrl",
});

const vedustSeekerStack = new VedustSeeker(app, "VedustSeeker", {
  env,
  tableName: "voting-escrow-dust",
  vpc: vpcStack.vpc,
  subnets: vpcStack.getLambdaSubnetSelection(),
  domainName: "api.neverland.jp-wiki.com",
  certUuid: "da4a526a-13d7-4c1e-80a7-6a1fdaffaafe",
  ssmCoingeckoApiKey: "/VedustSeeker/CoingeckoApiKey",
  ssmOpenSeaApiKey: "/VedustSeeker/OpenSeaApiKey",
  seekInterval: cdk.Duration.minutes(5),
  deviationLT: 0,
  dustUnitPriceLT: 0.40,
  notifierLambda: notifierStack.notifyDiscordLambda,
});
