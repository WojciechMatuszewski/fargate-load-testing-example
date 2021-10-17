package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sfn"
)

type LoadTestExecution struct {
	Concurrency int    `json:"concurrency"`
	HoldFor     string `json:"hold-for"`
	RampUp      string `json:"ramp-up"`
	Scenario    string `json:"scenario"`
}

type LoadTestScenario struct {
	Requests []LoadTestRequest `json:"requests"`
}

type LoadTestRequest struct {
	Label  string `json:"label"`
	Method string `json:"method"`
	URL    string `json:"url"`
}

type LoadTest struct {
	Execution LoadTestExecution           `json:"execution"`
	Scenarios map[string]LoadTestScenario `json:"scenarios"`
}

func main() {
	fmt.Println("Starting the load test")

	loadTest := LoadTest{
		Execution: LoadTestExecution{
			Concurrency: 1,
			HoldFor:     "1s",
			RampUp:      "1s",
			Scenario:    "sample",
		},
		Scenarios: map[string]LoadTestScenario{
			"sample": {
				Requests: []LoadTestRequest{
					{Label: "something", Method: "GET", URL: "https://webhook.site/5513a805-6831-4b1e-8f61-938c2e33c885"},
				},
			},
		},
	}

	fd, err := os.Create("./config.json")
	if err != nil {
		panic(err)
	}
	defer fd.Close()

	err = json.NewEncoder(fd).Encode(loadTest)
	if err != nil {
		panic(err)
	}

	cmd := exec.Command(
		"bzt",
		"./config.json",
	)
	out, err := cmd.Output()
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
}

func notifySuccess() {
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
