import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_dynamodb as dynamodb,
  aws_ec2 as ec2,
  aws_apigatewayv2 as apigatewayv2,
  aws_apigatewayv2_integrations as integrations,
  aws_certificatemanager as acm,
  aws_scheduler as scheduler,
  aws_scheduler_targets as targets,
  aws_iam as iam,
} from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib/core";
import * as path from "path";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import {
  ScheduleExpression,
  ScheduleTargetInput,
} from "aws-cdk-lib/aws-scheduler";

export interface VedustSeekerProps extends cdk.StackProps {
  readonly tableName: string;
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.SubnetSelection;
  readonly domainName?: string;
  readonly certUuid?: string;
  readonly ssmCoingeckoApiKey: string;
  readonly ssmOpenSeaApiKey: string;
  readonly seekInterval: cdk.Duration;
  readonly dustUnitPriceLT: number;
  readonly diviationLT: number;
}

export class VedustSeeker extends cdk.Stack {
  public readonly vedustDB: dynamodb.Table;
  public readonly vedustseekerLambda: lambda.Function;
  public readonly api: apigatewayv2.HttpApi;

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

    const vedustseekerFunctionName = "Vedustseeker";

    this.vedustseekerLambda = new NodejsFunction(this, "VedustseekerLambda", {
      functionName: vedustseekerFunctionName,
      entry: path.join(vedustseekerRepo, "src/seeker.ts"),
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(15),
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      loggingFormat: lambda.LoggingFormat.JSON,
      memorySize: 512,
      vpc: props.vpc,
      vpcSubnets: props.subnets,
      ipv6AllowedForDualStack: true,
      allowAllIpv6Outbound: true,
      allowAllOutbound: true,
      bundling: {
        minify: true,
        sourceMap: true,
        tsconfig: path.join(vedustseekerRepo, "tsconfig.json"),
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        DYNAMODB_TABLE_NAME: this.vedustDB.tableName,
        COINGECKO_API_KEY: StringParameter.valueForStringParameter(
          this,
          props.ssmCoingeckoApiKey,
        ),
        OPENSEA_API_KEY: StringParameter.valueForStringParameter(
          this,
          props.ssmOpenSeaApiKey,
        ),
        PARALLEL_FETCH_LIMIT: "10",
      },
    });

    this.vedustDB.grantReadWriteData(this.vedustseekerLambda);

    const domainName: apigatewayv2.DomainName | undefined =
      props.domainName && props.certUuid
        ? new apigatewayv2.DomainName(this, props.domainName, {
            domainName: props.domainName,
            certificate: acm.Certificate.fromCertificateArn(
              this,
              props.certUuid,
              cdk.Arn.format(
                {
                  service: "acm",
                  resource: "certificate",
                  resourceName: props.certUuid,
                },
                this,
              ),
            ),
          })
        : void 0;

    const apiName = "vedustSeekerApi";

    this.api = new apigatewayv2.HttpApi(this, apiName, {
      // ドメインが設定されてたら設定
      disableExecuteApiEndpoint: domainName ? true : false,
      defaultDomainMapping: domainName ? { domainName } : void 0,
    });

    const marketplaceRoute = new apigatewayv2.HttpRoute(
      this,
      "GetVedustSeekerGetMarketPlace",
      {
        httpApi: this.api,
        routeKey: apigatewayv2.HttpRouteKey.with(
          "/vedustseeker/marketplace",
          apigatewayv2.HttpMethod.GET,
        ),
        integration: new integrations.HttpLambdaIntegration(
          "GetVedustSeekerGetMarketPlaceIntegration",
          this.vedustseekerLambda,
        ),
      },
    );

    const schedulerRoleName = "SeekDiscountedNftsSchedulerRole";
    const schedulerRole = new iam.Role(this, schedulerRoleName, {
      roleName: schedulerRoleName,
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });
    const schedulerName = "SeekDiscountedNftsScheduler";
    const schedule = new scheduler.Schedule(this, schedulerName, {
      scheduleName: schedulerName,
      schedule: ScheduleExpression.rate(props.seekInterval),
      target: new targets.LambdaInvoke(this.vedustseekerLambda, {
        role: schedulerRole,
        input: ScheduleTargetInput.fromObject({
          queryStringParameters: {
            diviationLT: "0",
            // diviationLT: props.diviationLT.toString(),
            // dustUnitPriceLT: props.dustUnitPriceLT.toString(),
          },
        }),
      }),
    });
  }
}
