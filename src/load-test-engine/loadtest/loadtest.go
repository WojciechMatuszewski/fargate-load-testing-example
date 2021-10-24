package loadtest

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"os"
	"os/exec"
)

type execution struct {
	Concurrency int    `json:"concurrency"`
	HoldFor     string `json:"hold-for"`
	RampUp      string `json:"ramp-up"`
	Scenario    string `json:"scenario"`
}

type scenario struct {
	Requests []request `json:"requests"`
}

type request struct {
	Label  string `json:"label"`
	Method string `json:"method"`
	URL    string `json:"url"`
}

type report struct {
	Module        string `json:"module"`
	Filename      string `json:"filename"`
	SummaryLabels bool   `json:"summary"`
	FailedLabels  bool   `json:"failed-labels"`
	DumpXML       string `json:"dump-xml"`
	Percentiles   bool   `json:"percentiles"`
}

type data struct {
	Execution []execution         `json:"execution"`
	Scenarios map[string]scenario `json:"scenarios"`
	Reporting []report            `json:"reporting"`
}

type xmlResult struct {
	XMLName      xml.Name `xml:"FinalStatus"`
	Text         string   `xml:",chardata"`
	TestDuration string   `xml:"TestDuration"`
	Group        []struct {
		Text       string `xml:",chardata"`
		Label      string `xml:"label,attr"`
		Throughput struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"throughput"`
		Concurrency struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"concurrency"`
		Succ struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"succ"`
		Fail struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"fail"`
		AvgRt struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"avg_rt"`
		StdevRt struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"stdev_rt"`
		AvgLt struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"avg_lt"`
		AvgCt struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"avg_ct"`
		Bytes struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"bytes"`
		Rc struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Param     string `xml:"param,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"rc"`
		Perc []struct {
			Text      string `xml:",chardata"`
			AttrValue string `xml:"value,attr"`
			Param     string `xml:"param,attr"`
			Name      string `xml:"name"`
			Value     string `xml:"value"`
		} `xml:"perc"`
	} `xml:"Group"`
}

type JSONResult struct {
	FinalStatus struct {
		TestDuration string `json:"TestDuration"`
		Group        []struct {
			Throughput struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"throughput"`
			Concurrency struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"concurrency"`
			Succ struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"succ"`
			Fail struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"fail"`
			AvgRt struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"avg_rt"`
			StdevRt struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"stdev_rt"`
			AvgLt struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"avg_lt"`
			AvgCt struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"avg_ct"`
			Bytes struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"bytes"`
			Rc struct {
				Name  string `json:"name"`
				Value string `json:"value"`
				Param string `json:"_param"`
			} `json:"rc"`
			Perc []struct {
				Name  string `json:"name"`
				Value string `json:"value"`
				Param string `json:"_param"`
			} `json:"perc"`
			Label string `json:"_label"`
		} `json:"Group"`
	} `json:"FinalStatus"`
}

type LoadTest struct {
	data data

	resultFilePath string
	configFilePath string
}

type Input struct {
	Concurrency int
	HoldFor     string
	RampUp      string
	Method      string
	URL         string
}

func New(ltInput Input) *LoadTest {
	configFilePath := "./config.json"
	resultFilePath := "./result.xml"

	ltData := data{
		Execution: []execution{
			{
				Concurrency: ltInput.Concurrency,
				HoldFor:     ltInput.HoldFor,
				RampUp:      ltInput.RampUp,
				Scenario:    "load-test",
			},
		},
		Scenarios: map[string]scenario{
			"load-test": {
				Requests: []request{
					{Label: "load-test", Method: ltInput.Method, URL: ltInput.URL},
				},
			},
		},
		Reporting: []report{
			{
				Module:       "final-stats",
				DumpXML:      resultFilePath,
				Percentiles:  true,
				FailedLabels: true,
			},
		},
	}

	return &LoadTest{data: ltData, configFilePath: configFilePath, resultFilePath: resultFilePath}
}

func (lt LoadTest) Run() (JSONResult, error) {
	err := lt.createConfigFile()
	if err != nil {
		return JSONResult{}, err
	}

	err = lt.execute()
	if err != nil {
		return JSONResult{}, err
	}

	return JSONResult{}, nil
}

func (lt LoadTest) execute() error {
	cmd := exec.Command(
		"bzt",
		lt.configFilePath,
	)
	output, err := cmd.Output()
	fmt.Println(string(output))
	return err
}

func (lt LoadTest) createConfigFile() error {
	fd, err := os.Create(lt.configFilePath)
	if err != nil {
		return err
	}
	defer fd.Close()

	err = json.NewEncoder(fd).Encode(lt.data)
	if err != nil {
		return err
	}

	return nil
}

func (lt LoadTest) getResult() {
}
