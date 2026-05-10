import { Construct } from "constructs";
import { aws_ec2 as ec2, Fn } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib/core";

export interface VpcProps extends cdk.StackProps {}

export class Vpc extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id, props);
    const vpcName = "NeverlandSidekickVpc";
    this.vpc = new ec2.Vpc(this, vpcName, {
      restrictDefaultSecurityGroup: true,
      ipv6Addresses: ec2.Ipv6Addresses.amazonProvided(),
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Lambda",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
          ipv6AssignAddressOnCreation: true,
        },
      ],
      ipProtocol: ec2.IpProtocol.DUAL_STACK,
      gatewayEndpoints: {
        DynamoDB: {
          service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },
    });
  }
  public getLambdaSubnetSelection(): ec2.SubnetSelection {
    return this.vpc.selectSubnets({
      subnetGroupName: "Lambda",
    });
  }
}
