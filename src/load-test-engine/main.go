package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"engine/loadtest"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sfn"
)

func main() {
	fmt.Println("Starting")

	lt := loadtest.New(loadtest.Input{
		Concurrency: 1,
		HoldFor:     "1s",
		RampUp:      "1s",
	})

	lt.Run()

}

func notifySuccess(output string) error {
	taskToken := os.Getenv("TASK_TOKEN")
	if taskToken == "" {
		return errors.New("taskToken environment variable not found")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return err
	}

	client := sfn.NewFromConfig(cfg)
	_, err = client.SendTaskSuccess(
		context.Background(),
		&sfn.SendTaskSuccessInput{
			Output:    aws.String(output),
			TaskToken: aws.String(taskToken),
		},
	)
	return err
}
