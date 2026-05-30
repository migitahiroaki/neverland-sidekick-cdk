import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib/core";
import path from "path";

export interface NotifierProps extends cdk.StackProps {
  readonly ssmDiscordWebhookUrl: string;
  readonly ssmJsonbinBinId: string;
  readonly ssmJsonbinApiKey: string;
}

export class Notifier extends cdk.Stack {
  public readonly notifyDiscordLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: NotifierProps) {
    super(scope, id, props);

    const notifyDiscordLambdaName = "NotifyDiscordLambda";

    const logsNotifyDiscordRepo = path.join(
      __dirname,
      "../subprojects/logs-notify-discord",
    );

    // discordはIPv6非対応なので、VPC外のLambdaで送信する
    this.notifyDiscordLambda = new NodejsFunction(
      this,
      notifyDiscordLambdaName,
      {
        functionName: notifyDiscordLambdaName,
        entry: path.join(logsNotifyDiscordRepo, "src/notify.ts"),
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(10),
        applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
        loggingFormat: lambda.LoggingFormat.JSON,
        memorySize: 512,
        bundling: {
          minify: true,
          sourceMap: true,
          tsconfig: path.join(logsNotifyDiscordRepo, "tsconfig.json"),
        },
        environment: {
          WEBHOOK_URL: StringParameter.valueForStringParameter(
            this,
            props.ssmDiscordWebhookUrl,
          ),
          JSONBIN_BIN_ID: StringParameter.valueForStringParameter(
            this,
            props.ssmJsonbinBinId,
          ),
          JSONBIN_API_KEY: StringParameter.valueForStringParameter(
            this,
            props.ssmJsonbinApiKey,
          ),
        },
      },
    );
  }
}
