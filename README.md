# Load testing framework

Inspired by [this AWS solution](https://aws.amazon.com/solutions/implementations/distributed-load-testing-on-aws/)

**Work in progress**

## Learnings

- Is it surprisingly hard to create an "empty" IAM Role.
  The `actions` property **has to contain actions**. It cannot be an empty array.

- Good luck with deploying ECS/Fargate using _AWS SAM_. You will have to write raw _CloudFormation_. Good for learning but I'm not sure if it's time effective.

  - The _AWS CDK_ contains great abstractions around ECS and Fargate.

- In some cases you will have to provide the `env` parameter to the stack you are deploying.

  - In some cases you **will not be able to use the `cdk.Aws.X` properties – these return a token**.
    For example, when deploying a stack with a construct pointing to a _default VPC_ I had to use environment variables for the account_id and the region name.

- According [to this "best practices" documentation](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html#best-practices-constructs) one should favour composition with _constructs_ rather than nested stack.
