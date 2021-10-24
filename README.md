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

- There exists a difference between _AWS Fargate_ _task policy_ and the _execution policy_.

  - The _task policy_ policy is the one that the container uses. Note that I'm referring to a container here, not the _AWS Fargate_ service itself.

- The `--no-rollback` option is excellent, but sometimes it feels more like a hindrance than anything.

  - My main issue is the "Replacement type updates not supported on stack with disable-rollback." error message.
    - It might or might have something to do with the [limitation mentioned in the features documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html). Mainly the "Immutable update types aren't supported." one.
  - How can I disable the `--no-rollback` for a specific deployment? Am I even able to do this?
    - It seems to me this setting is a "creation" specific setting. I could amend it via CLI but the _AWS CDK_ does not expose that setting.

- Whenever you change the _task definition_ construct, a new _task definition_ will be created. This is because the _task definition_ is immutable.

- You will not be able to get the output of your _AWS ECS_ task run via _AWS StepFunctions_ directly (understandable).
  To get the output back to your state machine, use the `sendTaskSuccess` method. Remember to use the `.waitForTaskToken` modifier on the task definition!

- I wasted so much time trying to override the `ENTRYPOINT` property of the `blazemeter/taurus` property but the solution turned out to be very simple!

  - All I had to do was to specify an empty array as `ENTRYPOINT` 🤦‍♂️

- How does one passes variables from SFN to the container?

  - According to the [SFN documentation](https://docs.aws.amazon.com/step-functions/latest/dg/connect-ecs.html) one needs to use the `Overrides` parameter.
  - For our use-case the `Environment` is the relevant parameter (lives within the `Overrides`).
  - While the _environment variables_ are **not restricted in size by CFN, the SFN service imposes restrictions on size**.
    > [CloudFormation] We do not enforce a size limit on the environment variables, but a large environment variables file might fill up the disk space.
    > [Step Functions] A total of 8192 characters are allowed for overrides. This limit includes the JSON formatting characters of the override structure.

- The _HTTP_ flavour of _Amazon API Gateway_ is not really usable with direct integrations. It seems to me like the HTTP API is only good for very simple Lambda APIS (which might or might not be a good usage of the service).

  1. There is no way to transform the request
  2. There is no way to transform the response body (other things like headers and status code are transformable)

- How is the load spread between containers?
