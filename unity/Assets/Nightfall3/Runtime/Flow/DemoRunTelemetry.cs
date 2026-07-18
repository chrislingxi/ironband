using System;
using System.Collections.Generic;
using System.IO;
using Nightfall3.Actors;
using UnityEngine;

namespace Nightfall3.Flow
{
    public sealed class DemoRunTelemetry : MonoBehaviour
    {
        [Serializable]
        private sealed class PhaseDuration
        {
            public string phase;
            public float seconds;
        }

        [Serializable]
        private sealed class RunReport
        {
            public string build = "nightfall3-unity-demo";
            public string startedUtc;
            public string completedUtc;
            public string covenant;
            public float totalSeconds;
            public int deaths;
            public bool targetDurationPassed;
            public List<PhaseDuration> phases = new();
        }

        private DemoFlowController flow;
        private PlayerController player;
        private RunReport report;
        private string currentPhase;
        private float phaseStartedAt;
        private float runStartedAt;
        private bool written;

        public static string ReportPath => Path.Combine(Application.persistentDataPath, "nightfall3-last-run.json");
        public float ElapsedSeconds => Time.realtimeSinceStartup - runStartedAt;

        public static DemoRunTelemetry Create(DemoFlowController demoFlow, PlayerController playerController)
        {
            var telemetry = new GameObject("Run Telemetry", typeof(DemoRunTelemetry)).GetComponent<DemoRunTelemetry>();
            telemetry.flow = demoFlow;
            telemetry.player = playerController;
            telemetry.Begin();
            return telemetry;
        }

        private void Begin()
        {
            runStartedAt = Time.realtimeSinceStartup;
            phaseStartedAt = runStartedAt;
            currentPhase = flow != null ? flow.PhaseId : "Missing";
            report = new RunReport { startedUtc = DateTime.UtcNow.ToString("O") };
            if (player != null) player.Respawned += RecordDeath;
        }

        private void Update()
        {
            if (written || flow == null) return;
            if (flow.PhaseId != currentPhase)
            {
                CloseCurrentPhase();
                currentPhase = flow.PhaseId;
                phaseStartedAt = Time.realtimeSinceStartup;
            }
            if (flow.IsComplete) CompleteReport();
        }

        private void CloseCurrentPhase()
        {
            report.phases.Add(new PhaseDuration
            {
                phase = currentPhase,
                seconds = Mathf.Max(0f, Time.realtimeSinceStartup - phaseStartedAt)
            });
        }

        private void CompleteReport()
        {
            CloseCurrentPhase();
            written = true;
            report.completedUtc = DateTime.UtcNow.ToString("O");
            report.covenant = player != null ? player.CovenantName : "MISSING";
            report.totalSeconds = Mathf.Max(0f, Time.realtimeSinceStartup - runStartedAt);
            report.targetDurationPassed = report.totalSeconds is >= 900f and <= 1200f;
            var directory = Path.GetDirectoryName(ReportPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(ReportPath, JsonUtility.ToJson(report, true));
            Debug.Log($"NIGHTFALL RUN TELEMETRY: total={report.totalSeconds:0.0}s, covenant={report.covenant}, deaths={report.deaths}, target15to20={report.targetDurationPassed}, report={ReportPath}");
        }

        private void RecordDeath()
        {
            if (!written && report != null) report.deaths++;
        }

        private void OnDestroy()
        {
            if (player != null) player.Respawned -= RecordDeath;
        }
    }
}
