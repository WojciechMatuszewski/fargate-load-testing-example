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

https://docs.aws.amazon.com/solutions/latest/distributed-load-testing-on-aws/container-image.html
