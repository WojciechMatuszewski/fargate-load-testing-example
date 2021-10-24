package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"

	"engine/loadtest"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sfn"
)

func main() {
	lt := loadtest.New(loadtest.Input{
		Concurrency: 1,
		HoldFor:     "1s",
		RampUp:      "1s",
		Method:      "GET",
		URL:         "https://webhook.site/5513a805-6831-4b1e-8f61-938c2e33c885",
	})

	result, err := lt.Run()
	if err != nil {
		if err = notifyFailure(err.Error()); err != nil {
			panic(err)
		}

		fmt.Println("Failure notified", err.Error())
		return
	}

	buf, err := json.Marshal(result)
	if err != nil {
		if err = notifyFailure(err.Error()); err != nil {
			panic(err)
		}

		fmt.Println("Failure notified", err.Error())
		return
	}

	err = notifySuccess(string(buf))
	if err != nil {
		panic(err)
	}

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

func notifyFailure(cause string) error {
	taskToken := os.Getenv("TASK_TOKEN")
	if taskToken == "" {
		return errors.New("taskToken environment variable not found")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return err
	}

	client := sfn.NewFromConfig(cfg)
	_, err = client.SendTaskFailure(
		context.Background(),
		&sfn.SendTaskFailureInput{
			TaskToken: aws.String(taskToken),
			Cause:     aws.String(cause),
		},
	)
	return err

}
