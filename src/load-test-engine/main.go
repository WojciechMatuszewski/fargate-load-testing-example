package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
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

type LoadTestReport struct {
	Module        string `json:"module"`
	Filename      string `json:"filename"`
	SummaryLabels bool   `json:"summary"`
	FailedLabels  bool   `json:"failed-labels"`
	DumpXML       string `json:"dump-xml"`
	Percentiles   bool   `json:"percentiles"`
}

type LoadTest struct {
	Execution []LoadTestExecution         `json:"execution"`
	Scenarios map[string]LoadTestScenario `json:"scenarios"`
	Reporting []LoadTestReport            `json:"reporting"`
}

func main() {
	fmt.Println("Starting")

	ld := LoadTest{
		Execution: []LoadTestExecution{
			{
				Concurrency: 1,
				HoldFor:     "1s",
				RampUp:      "1s",
				Scenario:    "sample",
			},
		},
		Scenarios: map[string]LoadTestScenario{
			"sample": {
				Requests: []LoadTestRequest{
					{Label: "load-test", Method: "GET", URL: "https://webhook.site/5513a805-6831-4b1e-8f61-938c2e33c885"},
				},
			},
		},
		Reporting: []LoadTestReport{
			{
				Module:        "final-stats",
				Percentiles:   true,
				FailedLabels:  true,
				SummaryLabels: true,
				DumpXML:       "./report.xml",
			},
		},
	}

	err := runLoadTest(ld)
	if err != nil {
		panic(err)
	}

	fmt.Println("Load test done. Getting the results")

	fd, err := os.Open("./report.xml")
	if err != nil {
		panic(err)
	}
	defer fd.Close()

	buf, err := ioutil.ReadAll(fd)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(buf))
}

func runLoadTest(ld LoadTest) error {
	fd, err := os.Create("./config.json")
	if err != nil {
		return err
	}
	defer fd.Close()

	err = json.NewEncoder(fd).Encode(ld)
	if err != nil {
		return err
	}

	cmd := exec.Command(
		"bzt",
		"./config.json",
	)
	_, err = cmd.Output()
	if err != nil {
		return err
	}

	return nil
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
