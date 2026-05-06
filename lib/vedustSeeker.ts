import { LogLevel, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { aws_lambda as lambda, aws_dynamodb as dynamodb } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib/core";
import * as path from "path";

export interface VedustSeekerProps extends cdk.StackProps {
  readonly tableName: string;
}

export class VedustSeeker extends cdk.Stack {
  public readonly vedustDB: dynamodb.Table;
  public readonly vedustseekerLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: VedustSeekerProps) {
    super(scope, id, props);

    this.vedustDB = new dynamodb.Table(this, "VedustseekerDB", {
      tableName: props.tableName,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const vedustseekerRepo = path.join(
      __dirname,
      "../subprojects/vedustseeker",
    );

    this.vedustseekerLambda = new NodejsFunction(this, "VedustseekerLambda", {
      entry: path.join(vedustseekerRepo, "src/seeker.ts"),
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(10),
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      loggingFormat: lambda.LoggingFormat.JSON,
      bundling: {
        minify: false,
        sourceMap: true,
        tsconfig: path.join(vedustseekerRepo, "tsconfig.json"),
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        DYNAMODB_TABLE_NAME: this.vedustDB.tableName,
        OPENSEA_API_KEY: "", // 別関数でローテ
        PARALLEL_FETCH_LIMIT: "10",
      },
    });

    this.vedustDB.grantReadWriteData(this.vedustseekerLambda);
  }
}
