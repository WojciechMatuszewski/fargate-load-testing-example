package main

import (
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sfn"
)

func main() {
	taskToken := os.Getenv("TASK_TOKEN")
	if taskToken == "" {
		panic("taskToken environment variable not found")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		panic(err)
	}

	client := sfn.NewFromConfig(cfg)
	_, err = client.SendTaskSuccess(
		context.Background(),
		&sfn.SendTaskSuccessInput{
			Output:    aws.String(`{"message": "hio"}`),
			TaskToken: aws.String(taskToken),
		},
	)
	if err != nil {
		panic(err)
	}
}
