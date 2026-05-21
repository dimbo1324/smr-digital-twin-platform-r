package mqtt

import "testing"

func TestSanitizeTopicSegment(t *testing.T) {
	tests := map[string]string{
		"TT-101":         "TT-101",
		"TIC-101.OUTPUT": "TIC-101_OUTPUT",
		"Valve State":    "Valve-State",
		"///":            "unknown",
	}

	for input, expected := range tests {
		if actual := SanitizeTopicSegment(input); actual != expected {
			t.Fatalf("SanitizeTopicSegment(%q) = %q, want %q", input, actual, expected)
		}
	}
}

func TestBuildTopic(t *testing.T) {
	if actual := BuildTopic("smr/site-001/unit-001/", "/telemetry/snapshot"); actual != "smr/site-001/unit-001/telemetry/snapshot" {
		t.Fatalf("unexpected topic %q", actual)
	}
}
