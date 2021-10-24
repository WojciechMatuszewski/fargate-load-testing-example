package loadtest

import (
	"encoding/json"
	"encoding/xml"
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
	Text         string `xml:",chardata" json:"text,omitempty"`
	TestDuration string `xml:"TestDuration" json:"testDuration,omitempty"`
	Group        []struct {
		Throughput struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"throughput" json:"throughput,omitempty"`
		Concurrency struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"concurrency" json:"concurrency,omitempty"`
		Succ struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"succ" json:"succ,omitempty"`
		Fail struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"fail" json:"fail,omitempty"`
		AvgRt struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"avg_rt" json:"avgRt,omitempty"`
		StdevRt struct {
			Text  string `xml:",chardata" json:"text,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"stdev_rt" json:"stdevRt,omitempty"`
		AvgLt struct {
			Text  string `xml:",chardata" json:"text,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"avg_lt" json:"avgLt,omitempty"`
		AvgCt struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"avg_ct" json:"avgCt,omitempty"`
		Bytes struct {
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"bytes" json:"bytes,omitempty"`
		Rc struct {
			Param string `xml:"param,attr" json:"param,omitempty"`
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"rc" json:"rc,omitempty"`
		Perc []struct {
			Param string `xml:"param,attr" json:"param,omitempty"`
			Name  string `xml:"name" json:"name,omitempty"`
			Value string `xml:"value" json:"value,omitempty"`
		} `xml:"perc" json:"perc,omitempty"`
	} `xml:"Group" json:"group,omitempty"`
}

type Result struct {
	Throughput struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"throughput" json:"throughput,omitempty"`
	Concurrency struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"concurrency" json:"concurrency,omitempty"`
	Succ struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"succ" json:"succ,omitempty"`
	Fail struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"fail" json:"fail,omitempty"`
	AvgRt struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"avg_rt" json:"avgRt,omitempty"`
	StdevRt struct {
		Text  string `xml:",chardata" json:"text,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"stdev_rt" json:"stdevRt,omitempty"`
	AvgLt struct {
		Text  string `xml:",chardata" json:"text,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"avg_lt" json:"avgLt,omitempty"`
	AvgCt struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"avg_ct" json:"avgCt,omitempty"`
	Bytes struct {
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"bytes" json:"bytes,omitempty"`
	Rc struct {
		Param string `xml:"param,attr" json:"param,omitempty"`
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"rc" json:"rc,omitempty"`
	Perc []struct {
		Param string `xml:"param,attr" json:"param,omitempty"`
		Name  string `xml:"name" json:"name,omitempty"`
		Value string `xml:"value" json:"value,omitempty"`
	} `xml:"perc" json:"perc,omitempty"`
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

// New creates new load test
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

// Run runs the load test
func (lt LoadTest) Run() (Result, error) {
	err := lt.createConfigFile()
	if err != nil {
		return Result{}, err
	}

	err = lt.execute()
	if err != nil {
		return Result{}, err
	}

	return lt.getResult()
}

func (lt LoadTest) execute() error {
	cmd := exec.Command(
		"bzt",
		lt.configFilePath,
	)
	_, err := cmd.Output()
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

func (lt LoadTest) getResult() (Result, error) {
	fd, err := os.Open(lt.resultFilePath)
	if err != nil {
		return Result{}, err
	}

	var xmlRes xmlResult
	err = xml.NewDecoder(fd).Decode(&xmlRes)
	if err != nil {
		return Result{}, err
	}

	return xmlRes.Group[0], nil
}
