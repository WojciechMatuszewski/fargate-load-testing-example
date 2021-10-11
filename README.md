# Load testing framework

Inspired by [this AWS solution](https://aws.amazon.com/solutions/implementations/distributed-load-testing-on-aws/)

**Work in progress**

## Learnings

- Is it surprisingly hard to create an "empty" IAM Role.
  The `actions` property **has to contain actions**. It cannot be an empty array.

- Good luck with deploying ECS/Fargate using _AWS SAM_. You will have to write raw _CloudFormation_. Good for learning but I'm not sure if it's time effective.
  - The _AWS CDK_ contains great abstractions around ECS and Fargate.
