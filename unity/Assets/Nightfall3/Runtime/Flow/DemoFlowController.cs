using System.Collections.Generic;
using System.Linq;
using Nightfall3.Actors;
using Nightfall3.Audio;
using UnityEngine;

namespace Nightfall3.Flow
{
    public sealed class DemoFlowController : MonoBehaviour
    {
        private enum Phase
        {
            Briefing,
            GateFight,
            CovenantChoice,
            CovenantTrial,
            AdvanceCauseway,
            CausewayFight,
            AdvanceEchoHunt,
            EchoHunt,
            MasteryChoice,
            RunePattern,
            RunePuzzle,
            AdvanceWard,
            WardRitual,
            AdvanceDefense,
            SanctumDefense,
            AdvanceGauntlet,
            AshfallGauntlet,
            WitnessApproach,
            WitnessDialogue,
            AdvanceElite,
            EliteFight,
            WardflameEscort,
            ArchiveApproach,
            ArchiveCipher,
            ArchivePurge,
            ArchiveCurator,
            BossApproach,
            BossFight,
            RelicChoice,
            ReturnPortal,
            Complete
        }

        private readonly List<EnemyController> activeEnemies = new();
        private readonly List<WardAnchor> activeAnchors = new();
        private Phase phase;
        private Transform player;
        private PlayerController playerController;
        private Transform warden;
        private BossController boss;
        private int gateWave;
        private PlayerController.GrowthSnapshot encounterGrowth;
        private bool hasEncounterGrowth;
        private bool restartingEncounter;
        private Transform stormglassShrine;
        private Transform emberheartShrine;
        private readonly List<Transform> echoMonoliths = new();
        private int echoIndex;
        private bool echoWaveActive;
        private readonly List<Transform> memoryRunes = new();
        private readonly int[] runeSequence = { 1, 0, 2 };
        private int runeProgress;
        private int runeFailures;
        private bool runePlaybackActive;
        private Transform defenseBeacon;
        private int defenseWave;
        private int ashfallWave;
        private int ashfallRunId;
        private bool ashfallComplete;
        private float gauntletSafeX;
        private Transform witnessEcho;
        private int dialogueStep;
        private bool claimedWitnessPower;
        private EnemyController eliteWarden;
        private Transform oathLantern;
        private int escortStage;
        private float escortCheckpointZ;
        private readonly List<Transform> archiveRecords = new();
        private int archiveCorrectRecord;
        private int archiveFailures;
        private bool archivePunishmentActive;
        private int archivePurgeWave;
        private int archiveCollapseRunId;
        private EnemyController archiveCurator;
        private bool curatorSecondJudgment;
        private readonly List<Transform> relicAltars = new();
        private Transform returnPortal;
        private bool stormglassCovenant;

        public string ZoneName { get; private set; } = "EMBERWATCH CAMP";
        public string ObjectiveTitle { get; private set; } = "THE SEALED APPROACH";
        public string ObjectiveDetail { get; private set; } = "Speak with Mara, Ash Warden";
        public bool CanInteract => phase == Phase.Briefing && player != null && warden != null && Vector3.Distance(player.position, warden.position) <= 3.6f
            || phase == Phase.CovenantChoice && NearestCovenantDistance <= 2.6f
            || phase == Phase.EchoHunt && !echoWaveActive && CurrentEcho != null && Vector3.Distance(player.position, CurrentEcho.position) <= 2.6f
            || phase == Phase.RunePuzzle && NearestRuneDistance <= 1.65f
            || phase == Phase.WitnessApproach && witnessEcho != null && Vector3.Distance(player.position, witnessEcho.position) <= 2.6f
            || phase == Phase.ArchiveCipher && !archivePunishmentActive && NearestArchiveRecordDistance <= 2.35f
            || phase == Phase.RelicChoice && NearestRelicDistance <= 2.35f
            || phase == Phase.ReturnPortal && returnPortal != null && Vector3.Distance(player.position, returnPortal.position) <= 2.8f;
        public string InteractionLabel => phase == Phase.CovenantChoice ? "ATTUNE" : phase == Phase.EchoHunt ? "RECALL" : phase == Phase.RunePuzzle ? "ACTIVATE" : phase == Phase.WitnessApproach ? "LISTEN" : phase == Phase.ArchiveCipher ? "READ" : phase == Phase.RelicChoice ? "CLAIM" : phase == Phase.ReturnPortal ? "RETURN" : "SPEAK";
        public string CovenantName => playerController != null ? playerController.CovenantName : "UNBOUND";
        public bool CanChooseMastery => phase == Phase.MasteryChoice;
        public int RuneProgress => runeProgress;
        public int RuneFailures => runeFailures;
        public int ArchiveFailures => archiveFailures;
        public Vector3 GauntletSafePosition => new(gauntletSafeX, 0.05f, 74f);
        public bool HasDialogue => phase == Phase.WitnessDialogue;
        public string DialogueSpeaker => "ELOWEN'S ECHO  •  LAST WARDEN";
        public string DialogueLine => dialogueStep == 0 ? "The Castellan fed on every ward we raised. One oath still chains his armor." : "Take the last oath, Duskweaver. Decide what should survive me.";
        public string DialogueLeftOption => dialogueStep == 0 ? "HOW DO I BREAK IT?" : "RELEASE THE OATH";
        public string DialogueRightOption => dialogueStep == 0 ? "WHY TRUST AN ECHO?" : "CLAIM ITS POWER";
        public Vector3 EscortTargetPosition => oathLantern != null ? oathLantern.position + Vector3.forward * 1.6f : player.position;
        public int EscortStage => escortStage;
        public Vector3 InteractionTargetPosition => phase switch
        {
            Phase.CovenantChoice when stormglassShrine != null => stormglassShrine.position,
            Phase.EchoHunt when CurrentEcho != null => CurrentEcho.position,
            Phase.RunePuzzle when NearestRune != null => NearestRune.position,
            Phase.WitnessApproach when witnessEcho != null => witnessEcho.position,
            Phase.ArchiveCipher when NearestArchiveRecord != null => NearestArchiveRecord.position,
            Phase.RelicChoice when NearestRelic != null => NearestRelic.position,
            Phase.ReturnPortal when returnPortal != null => returnPortal.position,
            _ when warden != null => warden.position,
            _ => player != null ? player.position : Vector3.zero
        };

        public void Configure(Transform playerTransform, Transform wardenTransform)
        {
            player = playerTransform;
            warden = wardenTransform;
            playerController = player.GetComponent<PlayerController>();
            if (playerController != null)
            {
                playerController.RespawnPoint = player.position;
                playerController.Respawned += RestartCurrentEncounter;
            }
        }

        public void Interact()
        {
            if (phase == Phase.Briefing)
            {
                AudioDirector.PlaySelect();
                BeginGateFight();
                return;
            }
            if (phase == Phase.EchoHunt)
            {
                InteractWithEcho();
                return;
            }
            if (phase == Phase.RunePuzzle)
            {
                ActivateNearestRune();
                return;
            }
            if (phase == Phase.WitnessApproach)
            {
                if (CanInteract) BeginWitnessDialogue();
                return;
            }
            if (phase == Phase.ArchiveCipher)
            {
                if (CanInteract) ReadArchiveRecord(archiveRecords.IndexOf(NearestArchiveRecord));
                return;
            }
            if (phase == Phase.RelicChoice)
            {
                if (CanInteract) ChooseRelic(relicAltars.IndexOf(NearestRelic));
                return;
            }
            if (phase == Phase.ReturnPortal)
            {
                if (CanInteract) CompleteDemo();
                return;
            }
            if (phase != Phase.CovenantChoice || NearestCovenantDistance > 2.6f) return;
            ChooseCovenant(stormglassShrine != null && Vector3.Distance(player.position, stormglassShrine.position) <= Vector3.Distance(player.position, emberheartShrine.position));
        }

        private void Update()
        {
            if (player == null) return;
            if (phase == Phase.Briefing)
            {
                if ((CanInteract && Input.GetKeyDown(KeyCode.E)) || player.position.z > -7.5f) BeginGateFight();
                return;
            }
            if (phase == Phase.CovenantChoice)
            {
                if (CanInteract && Input.GetKeyDown(KeyCode.E)) Interact();
                return;
            }
            if (phase == Phase.EchoHunt && !echoWaveActive)
            {
                if (CanInteract && Input.GetKeyDown(KeyCode.E)) InteractWithEcho();
                return;
            }
            if (phase == Phase.MasteryChoice)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1)) SelectMastery(0);
                else if (Input.GetKeyDown(KeyCode.Alpha2)) SelectMastery(1);
                return;
            }
            if (phase == Phase.RunePattern) return;
            if (phase == Phase.RunePuzzle)
            {
                if (CanInteract && Input.GetKeyDown(KeyCode.E)) ActivateNearestRune();
                return;
            }
            if (phase == Phase.WitnessApproach)
            {
                if (CanInteract && Input.GetKeyDown(KeyCode.E)) BeginWitnessDialogue();
                return;
            }
            if (phase == Phase.ArchiveCipher && !archivePunishmentActive)
            {
                if (CanInteract && Input.GetKeyDown(KeyCode.E)) Interact();
                return;
            }
            if (phase == Phase.WitnessDialogue)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1)) ChooseDialogue(0);
                else if (Input.GetKeyDown(KeyCode.Alpha2)) ChooseDialogue(1);
                return;
            }
            if (phase == Phase.RelicChoice || phase == Phase.ReturnPortal)
            {
                if (CanInteract && Input.GetKeyDown(KeyCode.E)) Interact();
                return;
            }

            activeEnemies.RemoveAll(enemy => enemy == null);
            switch (phase)
            {
                case Phase.GateFight when activeEnemies.Count == 0:
                    if (gateWave == 1) BeginGateReinforcements();
                    else
                    {
                        BeginCovenantChoice();
                    }
                    break;
                case Phase.CovenantTrial when activeEnemies.Count == 0:
                    phase = Phase.AdvanceCauseway;
                    ZoneName = "THE BROKEN CAUSEWAY";
                    ObjectiveTitle = "BEYOND THE BLACK GATE";
                    ObjectiveDetail = "Carry the covenant into the ravine";
                    SetCheckpoint(new Vector3(0f, 0.05f, 13.5f));
                    break;
                case Phase.AdvanceCauseway when player.position.z >= 17.5f:
                    BeginCausewayFight();
                    break;
                case Phase.CausewayFight when activeEnemies.Count == 0:
                    phase = Phase.AdvanceEchoHunt;
                    ZoneName = "THE SUNKEN PROCESSION";
                    ObjectiveTitle = "VOICES BENEATH THE STONE";
                    ObjectiveDetail = "Find the first Ashen Echo";
                    SetCheckpoint(new Vector3(0f, 0.05f, 24.5f));
                    break;
                case Phase.AdvanceEchoHunt when player.position.z >= 27f:
                    BeginEchoHunt();
                    break;
                case Phase.EchoHunt when echoWaveActive && activeEnemies.Count == 0:
                    CompleteEchoWave();
                    break;
                case Phase.AdvanceWard when player.position.z >= 45f:
                    BeginWardRitual();
                    break;
                case Phase.WardRitual when activeEnemies.Count == 0 && activeAnchors.All(anchor => anchor == null):
                    phase = Phase.AdvanceDefense;
                    ObjectiveTitle = "THE LAST WARD-FLAME";
                    ObjectiveDetail = "Reach the Emberwatch beacon";
                    SetCheckpoint(new Vector3(0f, 0.05f, 51.5f));
                    break;
                case Phase.AdvanceDefense when player.position.z >= 55f:
                    BeginSanctumDefense();
                    break;
                case Phase.SanctumDefense when activeEnemies.Count == 0:
                    if (defenseWave < 3) SpawnDefenseWave(++defenseWave);
                    else CompleteSanctumDefense();
                    break;
                case Phase.AdvanceGauntlet when player.position.z >= 62f:
                    BeginAshfallGauntlet();
                    break;
                case Phase.AshfallGauntlet when ashfallComplete && player.position.z >= 73.5f:
                    CompleteAshfallGauntlet();
                    break;
                case Phase.AdvanceElite when player.position.z >= 78f:
                    BeginEliteFight();
                    break;
                case Phase.EliteFight when activeEnemies.Count == 0 && activeAnchors.All(anchor => anchor == null):
                    BeginWardflameEscort();
                    break;
                case Phase.WardflameEscort:
                    UpdateWardflameEscort();
                    break;
                case Phase.ArchiveApproach when player.position.z >= 110f:
                    BeginArchiveCipher();
                    break;
                case Phase.ArchiveCipher when archivePunishmentActive && activeEnemies.Count == 0:
                    RestoreArchiveCipher();
                    break;
                case Phase.ArchivePurge when activeEnemies.Count == 0:
                    if (archivePurgeWave < 3) SpawnArchivePurgeWave(++archivePurgeWave);
                    else BeginArchiveCurator();
                    break;
                case Phase.ArchiveCurator:
                    UpdateArchiveCurator();
                    break;
                case Phase.BossApproach when player.position.z >= 143f:
                    BeginBossFight();
                    break;
            }
        }

        private void BeginGateFight()
        {
            CaptureEncounterGrowth();
            phase = Phase.GateFight;
            gateWave = 1;
            ZoneName = "ASHEN APPROACH";
            ObjectiveTitle = "BLOODBOUND AT THE GATE";
            ObjectiveDetail = "Break the first war pack";
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-3.6f, 0.05f, -1.8f), 64f, 2.55f, 1.85f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(2.8f, 0.05f, -0.4f), 82f, 1.9f, 2.15f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(4.3f, 0.05f, 1.2f), 58f, 3.2f, 1.8f);
            Spawn("Art/Monsters/blue-ash-juggernaut-v2", new Vector3(-2.2f, 0.05f, 2.8f), 185f, 1.45f, 3.3f);
        }

        private void BeginGateReinforcements()
        {
            gateWave = 2;
            ObjectiveTitle = "THE GATE HOWLS AGAIN";
            ObjectiveDetail = "Survive the bloodbound reinforcement";
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-5.2f, 0.05f, 3.8f), 72f, 3.35f, 1.85f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(5.1f, 0.05f, 4.1f), 72f, 3.35f, 1.85f);
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-3.4f, 0.05f, 5.2f), 84f, 2.7f, 1.9f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(0f, 0.05f, 6.2f), 108f, 2.05f, 2.2f);
            Spawn("Art/Monsters/blue-ash-juggernaut-v2", new Vector3(3.6f, 0.05f, 5.3f), 215f, 1.5f, 3.35f);
        }

        private void BeginCausewayFight()
        {
            CaptureEncounterGrowth();
            phase = Phase.CausewayFight;
            ObjectiveTitle = "THE RAVENING LINE";
            ObjectiveDetail = "Destroy the ambush on the causeway";
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-4.5f, 0.05f, 19f), 78f, 2.7f, 1.85f);
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(3.9f, 0.05f, 20.2f), 78f, 2.7f, 1.85f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(-1.8f, 0.05f, 21.8f), 96f, 2f, 2.15f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(2.2f, 0.05f, 22.6f), 96f, 2f, 2.15f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-5.2f, 0.05f, 23.5f), 68f, 3.35f, 1.8f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(5f, 0.05f, 24.1f), 68f, 3.35f, 1.8f);
        }

        private void BeginCovenantChoice()
        {
            phase = Phase.CovenantChoice;
            ZoneName = "THE FORSAKEN CROSSING";
            ObjectiveTitle = "A COVENANT IN ASH";
            ObjectiveDetail = "West: Stormglass  •  East: Emberheart";
            SetCheckpoint(new Vector3(0f, 0.05f, 5.5f));
            stormglassShrine = DemoDirector.CreateCovenantShrine("Stormglass Reliquary", "Art/Props/stormglass-shrine-v1", new Vector3(-5.45f, 0.04f, 8.6f), 4.25f, new Color(0.18f, 0.78f, 1f), "STORMGLASS");
            emberheartShrine = DemoDirector.CreateCovenantShrine("Emberheart Reliquary", "Art/Props/emberheart-shrine-v1", new Vector3(5.45f, 0.04f, 8.6f), 4.25f, new Color(1f, 0.28f, 0.06f), "EMBERHEART");
        }

        private void ChooseCovenant(bool stormglass)
        {
            var selected = stormglass ? stormglassShrine : emberheartShrine;
            playerController?.ApplyCovenant(stormglass);
            AudioDirector.PlaySelect();
            if (selected != null) DemoDirector.SpawnShockwave(selected.position, stormglass ? new Color(0.18f, 0.78f, 1f) : new Color(1f, 0.28f, 0.06f));
            if (stormglassShrine != null) Destroy(stormglassShrine.gameObject, 0.16f);
            if (emberheartShrine != null) Destroy(emberheartShrine.gameObject, 0.16f);
            stormglassShrine = emberheartShrine = null;
            stormglassCovenant = stormglass;
            BeginCovenantTrial();
        }

        private void BeginCovenantTrial()
        {
            CaptureEncounterGrowth();
            phase = Phase.CovenantTrial;
            ZoneName = "THE FORSAKEN CROSSING";
            ObjectiveTitle = stormglassCovenant ? "THE STORMGLASS TRIAL" : "THE EMBERHEART TRIAL";
            ObjectiveDetail = stormglassCovenant ? "Break the hunting current" : "Stand against the iron tide";
            if (stormglassCovenant)
            {
                Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-4.2f, 0.05f, 11.2f), 76f, 3.45f, 1.85f);
                Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(4.2f, 0.05f, 11.6f), 76f, 3.45f, 1.85f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-1.8f, 0.05f, 13f), 92f, 2.8f, 1.9f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(2.1f, 0.05f, 13.4f), 92f, 2.8f, 1.9f);
            }
            else
            {
                Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(-3.2f, 0.05f, 11.8f), 128f, 2.1f, 2.2f);
                Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(3.2f, 0.05f, 12.1f), 128f, 2.1f, 2.2f);
                Spawn("Art/Monsters/blue-ash-juggernaut-v2", new Vector3(0f, 0.05f, 14.2f), 275f, 1.55f, 3.45f);
            }
        }

        private float NearestCovenantDistance
        {
            get
            {
                if (player == null) return float.MaxValue;
                var west = stormglassShrine != null ? Vector3.Distance(player.position, stormglassShrine.position) : float.MaxValue;
                var east = emberheartShrine != null ? Vector3.Distance(player.position, emberheartShrine.position) : float.MaxValue;
                return Mathf.Min(west, east);
            }
        }

        private Transform CurrentEcho => echoIndex >= 0 && echoIndex < echoMonoliths.Count ? echoMonoliths[echoIndex] : null;

        private void BeginEchoHunt()
        {
            CaptureEncounterGrowth();
            phase = Phase.EchoHunt;
            ZoneName = "THE SUNKEN PROCESSION";
            ObjectiveTitle = "ASHEN ECHO I";
            ObjectiveDetail = "Recall the western memory stele";
            echoIndex = 0;
            echoWaveActive = false;
            echoMonoliths.Clear();
            echoMonoliths.Add(DemoDirector.CreateCovenantShrine("Ashen Echo I", "Art/Props/ashen-echo-monolith-v1", new Vector3(-5.4f, 0.04f, 30f), 3.75f, new Color(0.5f, 0.88f, 1f), "ECHO I"));
            echoMonoliths.Add(DemoDirector.CreateCovenantShrine("Ashen Echo II", "Art/Props/ashen-echo-monolith-v1", new Vector3(5.35f, 0.04f, 36f), 3.75f, new Color(0.5f, 0.88f, 1f), "ECHO II"));
            echoMonoliths.Add(DemoDirector.CreateCovenantShrine("Ashen Echo III", "Art/Props/ashen-echo-monolith-v1", new Vector3(-4.8f, 0.04f, 42f), 3.75f, new Color(0.5f, 0.88f, 1f), "ECHO III"));
        }

        private void InteractWithEcho()
        {
            if (phase != Phase.EchoHunt || echoWaveActive || CurrentEcho == null || Vector3.Distance(player.position, CurrentEcho.position) > 2.6f) return;
            StartEchoWave();
        }

        private void StartEchoWave()
        {
            if (CurrentEcho == null) return;
            AudioDirector.PlaySelect();
            DemoDirector.SpawnShockwave(CurrentEcho.position, new Color(0.45f, 0.86f, 1f));
            echoWaveActive = true;
            ObjectiveTitle = $"MEMORY AMBUSH {echoIndex + 1}/3";
            ObjectiveDetail = "Survive what the fortress remembers";
            var center = CurrentEcho.position;
            if (echoIndex == 0)
            {
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(-2.8f, 0f, 1.4f), 92f, 2.75f, 1.9f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(2.6f, 0f, 1.8f), 92f, 2.75f, 1.9f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(0.4f, 0f, 3.4f), 82f, 3.4f, 1.85f);
            }
            else if (echoIndex == 1)
            {
                Spawn("Art/Monsters/coldbone-shieldguard-v2", center + new Vector3(-2.6f, 0f, 1.7f), 132f, 2.05f, 2.2f);
                Spawn("Art/Monsters/coldbone-shieldguard-v2", center + new Vector3(2.8f, 0f, 1.4f), 132f, 2.05f, 2.2f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(0f, 0f, 3.8f), 96f, 3.45f, 1.9f);
            }
            else
            {
                Spawn("Art/Monsters/blue-ash-juggernaut-v2", center + new Vector3(0f, 0f, 3.4f), 360f, 1.55f, 3.55f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(-3.4f, 0f, 1.5f), 108f, 2.8f, 1.9f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(3.4f, 0f, 1.5f), 108f, 2.8f, 1.9f);
            }
        }

        private void CompleteEchoWave()
        {
            echoWaveActive = false;
            if (CurrentEcho != null) Destroy(CurrentEcho.gameObject, 0.2f);
            echoIndex++;
            if (echoIndex >= echoMonoliths.Count)
            {
                phase = Phase.MasteryChoice;
                ObjectiveTitle = "SHAPE THE RECALLED POWER";
                ObjectiveDetail = "Choose one permanent Duskweaver mastery";
                return;
            }
            ObjectiveTitle = $"ASHEN ECHO {echoIndex + 1}";
            ObjectiveDetail = echoIndex == 1 ? "Seek the eastern memory stele" : "Find the final echo beneath the ward";
            SetCheckpoint(CurrentEcho.position + Vector3.back * 1.8f);
        }

        public void SelectMastery(int mastery)
        {
            if (phase != Phase.MasteryChoice) return;
            playerController?.ApplyMastery(mastery);
            AudioDirector.PlaySelect();
            DemoDirector.SpawnShockwave(player.position, mastery == 0 ? new Color(0.2f, 0.8f, 1f) : new Color(0.58f, 0.38f, 1f));
            SetCheckpoint(new Vector3(0f, 0.05f, 42.5f));
            StartCoroutine(BeginRunePattern(mastery == 0 ? "STORM LATTICE FORGED" : "FROZEN WAKE FORGED"));
        }

        private System.Collections.IEnumerator BeginRunePattern(string masteryTitle)
        {
            phase = Phase.RunePattern;
            ZoneName = "THE ECHO CONSTELLATION";
            ObjectiveTitle = masteryTitle;
            ObjectiveDetail = "Watch the three-sign memory";
            runeProgress = 0;
            runePlaybackActive = true;
            if (memoryRunes.Count == 0)
            {
                memoryRunes.Add(DemoDirector.CreateCovenantShrine("Crown Memory Rune", "Art/Props/ashen-echo-monolith-v1", new Vector3(-4.25f, 0.04f, 45f), 3.25f, new Color(0.28f, 0.76f, 1f), "CROWN"));
                memoryRunes.Add(DemoDirector.CreateCovenantShrine("Eye Memory Rune", "Art/Props/ashen-echo-monolith-v1", new Vector3(0f, 0.04f, 46.2f), 3.25f, new Color(0.58f, 0.36f, 1f), "EYE"));
                memoryRunes.Add(DemoDirector.CreateCovenantShrine("Flame Memory Rune", "Art/Props/ashen-echo-monolith-v1", new Vector3(4.25f, 0.04f, 45f), 3.25f, new Color(1f, 0.34f, 0.08f), "FLAME"));
            }
            yield return new WaitForSecondsRealtime(0.85f);
            ObjectiveTitle = "REMEMBER THE STAR-SEQUENCE";
            foreach (var runeIndex in runeSequence)
            {
                PulseRune(runeIndex);
                yield return new WaitForSecondsRealtime(0.72f);
            }
            runePlaybackActive = false;
            phase = Phase.RunePuzzle;
            ObjectiveTitle = "ECHO CONSTELLATION";
            ObjectiveDetail = "Repeat the three-sign memory  •  0/3";
        }

        private Transform NearestRune => memoryRunes.Where(rune => rune != null).OrderBy(rune => Vector3.Distance(player.position, rune.position)).FirstOrDefault();
        private float NearestRuneDistance => NearestRune != null ? Vector3.Distance(player.position, NearestRune.position) : float.MaxValue;

        private void ActivateNearestRune()
        {
            if (phase != Phase.RunePuzzle || runePlaybackActive || NearestRuneDistance > 1.65f) return;
            var selected = memoryRunes.IndexOf(NearestRune);
            if (selected == runeSequence[runeProgress])
            {
                PulseRune(selected);
                runeProgress++;
                ObjectiveDetail = $"Repeat the three-sign memory  •  {runeProgress}/3";
                if (runeProgress == runeSequence.Length) CompleteRunePuzzle();
                return;
            }
            runeProgress = 0;
            runeFailures++;
            ObjectiveTitle = "THE MEMORY FRACTURES";
            ObjectiveDetail = "The sequence resets  •  watch again";
            DemoDirector.SpawnShockwave(NearestRune.position, new Color(0.9f, 0.08f, 0.12f));
            StartCoroutine(BeginRunePattern("THE MEMORY REFORMS"));
        }

        private void PulseRune(int index)
        {
            if (index < 0 || index >= memoryRunes.Count || memoryRunes[index] == null) return;
            AudioDirector.PlaySelect();
            DemoDirector.SpawnShockwave(memoryRunes[index].position, index == 0 ? new Color(0.28f, 0.76f, 1f) : index == 1 ? new Color(0.58f, 0.36f, 1f) : new Color(1f, 0.34f, 0.08f));
        }

        private void CompleteRunePuzzle()
        {
            AudioDirector.PlaySelect();
            foreach (var rune in memoryRunes)
            {
                if (rune != null) Destroy(rune.gameObject, 0.4f);
            }
            phase = Phase.AdvanceWard;
            ZoneName = "THE COLD WARD";
            ObjectiveTitle = "THE CONSTELLATION OPENS";
            ObjectiveDetail = "Follow the recalled path to the blue seals";
            SetCheckpoint(new Vector3(0f, 0.05f, 45.5f));
        }

        private void BeginSanctumDefense()
        {
            CaptureEncounterGrowth();
            phase = Phase.SanctumDefense;
            ZoneName = "EMBERWATCH REDOUBT";
            defenseWave = 1;
            if (defenseBeacon == null)
                defenseBeacon = DemoDirector.CreateCovenantShrine("Emberwatch Ward Beacon", "Art/Props/emberwatch-ward-beacon-v1", new Vector3(0f, 0.04f, 58f), 4.3f, new Color(0.35f, 0.84f, 1f), "WARD-FLAME");
            SpawnDefenseWave(defenseWave);
        }

        private void SpawnDefenseWave(int wave)
        {
            ObjectiveTitle = $"HOLD THE WARD-FLAME  •  WAVE {wave}/3";
            ObjectiveDetail = wave == 1 ? "Break the hunting ring" : wave == 2 ? "Hold against the shield line" : "Survive the blue-ash breaker";
            if (wave == 1)
            {
                Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-5.4f, 0.05f, 58f), 105f, 3.45f, 1.9f);
                Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(5.4f, 0.05f, 58.5f), 105f, 3.45f, 1.9f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(0f, 0.05f, 62f), 118f, 2.8f, 1.9f);
            }
            else if (wave == 2)
            {
                Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(-4.5f, 0.05f, 60f), 155f, 2.1f, 2.2f);
                Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(4.5f, 0.05f, 60f), 155f, 2.1f, 2.2f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-1.8f, 0.05f, 63f), 125f, 2.8f, 1.9f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(1.8f, 0.05f, 63f), 125f, 2.8f, 1.9f);
            }
            else
            {
                Spawn("Art/Monsters/blue-ash-juggernaut-v2", new Vector3(0f, 0.05f, 63.5f), 460f, 1.58f, 3.7f);
                Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-4.8f, 0.05f, 61f), 120f, 3.5f, 1.95f);
                Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(4.8f, 0.05f, 61f), 120f, 3.5f, 1.95f);
                Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(0f, 0.05f, 60.5f), 170f, 2.15f, 2.25f);
            }
        }

        private void CompleteSanctumDefense()
        {
            if (defenseBeacon != null) DemoDirector.SpawnShockwave(defenseBeacon.position, new Color(0.4f, 0.9f, 1f));
            phase = Phase.AdvanceGauntlet;
            ZoneName = "THE SHATTERED SPAN";
            ObjectiveTitle = "WARD-FLAME RESTORED";
            ObjectiveDetail = "Enter the bridge beneath the falling citadel";
            SetCheckpoint(new Vector3(0f, 0.05f, 61.5f));
        }

        private void BeginAshfallGauntlet()
        {
            phase = Phase.AshfallGauntlet;
            ZoneName = "THE SHATTERED SPAN";
            ObjectiveTitle = "ASHFALL DESCENT";
            ObjectiveDetail = "Read the impact signs and cross the bridge";
            ashfallWave = 0;
            ashfallComplete = false;
            gauntletSafeX = 0f;
            var runId = ++ashfallRunId;
            StartCoroutine(AshfallRoutine(runId));
        }

        private System.Collections.IEnumerator AshfallRoutine(int runId)
        {
            yield return new WaitForSecondsRealtime(0.8f);
            var safeLanes = new[] { 1, 0, 2, 1, 2, 0, 1, 0, 2, 1 };
            for (var wave = 0; wave < safeLanes.Length && phase == Phase.AshfallGauntlet && runId == ashfallRunId; wave++)
            {
                ashfallWave = wave + 1;
                var safeLane = safeLanes[wave];
                gauntletSafeX = (safeLane - 1) * 4f;
                ObjectiveTitle = $"ASHFALL DESCENT  •  {ashfallWave}/{safeLanes.Length}";
                ObjectiveDetail = "Move through the unmarked lane before impact";
                var impactZ = Mathf.Clamp(player.position.z + 3.6f, 64f, 73f);
                for (var lane = 0; lane < 3; lane++)
                {
                    if (lane == safeLane) continue;
                    var hazard = new GameObject($"Ashfall Wave {ashfallWave} Lane {lane}", typeof(AshfallHazard)).GetComponent<AshfallHazard>();
                    hazard.Configure(new Vector3((lane - 1) * 4f, 0.05f, impactZ), playerController);
                }
                yield return new WaitForSecondsRealtime(2.15f);
            }
            if (phase != Phase.AshfallGauntlet || runId != ashfallRunId) yield break;
            ashfallComplete = true;
            gauntletSafeX = 0f;
            ObjectiveTitle = "THE SPAN ENDURES";
            ObjectiveDetail = "Reach the far rampart";
        }

        private void CompleteAshfallGauntlet()
        {
            ++ashfallRunId;
            phase = Phase.WitnessApproach;
            ZoneName = "THE OATHBOUND LANDING";
            ObjectiveTitle = "A VOICE IN THE ASH";
            ObjectiveDetail = "Listen to the last Warden's echo";
            witnessEcho = DemoDirector.CreateCovenantShrine("Elowen's Echo", "Art/NPCs/sister-elowen-v2", new Vector3(0f, 0.04f, 76.5f), 3.35f, new Color(0.52f, 0.82f, 1f), "ELOWEN'S ECHO");
            SetCheckpoint(new Vector3(0f, 0.05f, 75f));
        }

        private void BeginWitnessDialogue()
        {
            if (phase != Phase.WitnessApproach) return;
            phase = Phase.WitnessDialogue;
            dialogueStep = 0;
            ObjectiveTitle = "THE LAST OATH";
            ObjectiveDetail = "Hear what the fortress buried";
            AudioDirector.PlaySelect();
        }

        public void ChooseDialogue(int option)
        {
            if (phase != Phase.WitnessDialogue) return;
            AudioDirector.PlaySelect();
            if (dialogueStep == 0)
            {
                dialogueStep = 1;
                return;
            }
            claimedWitnessPower = option == 1;
            playerController?.ApplyWitnessChoice(claimedWitnessPower);
            if (witnessEcho != null)
            {
                DemoDirector.SpawnShockwave(witnessEcho.position, claimedWitnessPower ? new Color(0.62f, 0.28f, 1f) : new Color(0.35f, 0.86f, 1f));
                Destroy(witnessEcho.gameObject, 0.3f);
            }
            phase = Phase.AdvanceElite;
            ZoneName = "THE INNER PROCESSION";
            ObjectiveTitle = claimedWitnessPower ? "THE OATH IS YOURS" : "THE OATH IS FREE";
            ObjectiveDetail = "Hunt the blue-ash warden beyond the landing";
            SetCheckpoint(new Vector3(0f, 0.05f, 77f));
        }

        private void BeginEliteFight()
        {
            CaptureEncounterGrowth();
            phase = Phase.EliteFight;
            ObjectiveTitle = "THE OATH-CHAIN WARDEN";
            ObjectiveDetail = claimedWitnessPower ? "Break three chains shielding the elite" : "Break two chains shielding the elite";
            activeAnchors.Clear();
            eliteWarden = Spawn("Art/Monsters/blue-ash-juggernaut-v2", new Vector3(0f, 0.05f, 80f), claimedWitnessPower ? 760f : 620f, 1.6f, 3.9f);
            eliteWarden?.EnableWardShield();
            SpawnEliteChain(new Vector3(-4.4f, 0.05f, 80f));
            SpawnEliteChain(new Vector3(4.4f, 0.05f, 80f));
            if (claimedWitnessPower) SpawnEliteChain(new Vector3(0f, 0.05f, 83f));
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-4.2f, 0.05f, 79f), 148f, 3.4f, 1.95f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(4.2f, 0.05f, 79f), 148f, 3.4f, 1.95f);
        }

        private void SpawnEliteChain(Vector3 position)
        {
            activeAnchors.Add(DemoDirector.CreateWardAnchor(position, OnEliteChainDestroyed));
        }

        private void OnEliteChainDestroyed(WardAnchor anchor)
        {
            activeAnchors.Remove(anchor);
            if (activeAnchors.Any(active => active != null))
            {
                ObjectiveDetail = $"Break the remaining oath-chains  •  {activeAnchors.Count(active => active != null)}";
                return;
            }
            eliteWarden?.BreakWardShield();
            ObjectiveTitle = "THE WARDEN UNBOUND";
            ObjectiveDetail = "Survive its oathless rage";
        }

        private void BeginWardflameEscort()
        {
            phase = Phase.WardflameEscort;
            ZoneName = "THE OATHBOUND PROCESSION";
            ObjectiveTitle = "BEAR THE LAST WARD-FLAME";
            ObjectiveDetail = "Stay near the flame and clear its path";
            escortStage = 0;
            escortCheckpointZ = 82f;
            if (oathLantern == null)
                oathLantern = DemoDirector.CreateCovenantShrine("Elowen's Ward-Flame", "Art/Props/emberwatch-ward-beacon-v1", new Vector3(0f, 0.04f, 82f), 3.45f, new Color(0.32f, 0.86f, 1f), "WARD-FLAME");
            SetCheckpoint(new Vector3(0f, 0.05f, 81f));
        }

        private void UpdateWardflameEscort()
        {
            if (oathLantern == null || activeEnemies.Any(enemy => enemy != null)) return;
            if (Vector3.Distance(player.position, oathLantern.position) > 4.2f)
            {
                ObjectiveDetail = "Return to the fading ward-flame";
                return;
            }
            ObjectiveDetail = "Keep pace with the ward-flame";
            oathLantern.position += Vector3.forward * (1.35f * Time.deltaTime);
            if (escortStage == 0 && oathLantern.position.z >= 88f) SpawnEscortWave(1);
            else if (escortStage == 1 && oathLantern.position.z >= 95f) SpawnEscortWave(2);
            else if (escortStage == 2 && oathLantern.position.z >= 102f) SpawnEscortWave(3);
            else if (escortStage == 3 && oathLantern.position.z >= 106f) CompleteWardflameEscort();
        }

        private void SpawnEscortWave(int stage)
        {
            escortStage = stage;
            escortCheckpointZ = oathLantern.position.z - 0.6f;
            ObjectiveTitle = $"WARD-FLAME AMBUSH  •  {stage}/3";
            ObjectiveDetail = stage == 1 ? "Break the hunting crescent" : stage == 2 ? "Open the shield wall" : "Defeat the oath-eater";
            SetCheckpoint(new Vector3(0f, 0.05f, escortCheckpointZ - 1.2f));
            var center = oathLantern.position;
            if (stage == 1)
            {
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(-4f, 0f, 1f), 135f, 3.5f, 1.95f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(4f, 0f, 1f), 135f, 3.5f, 1.95f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(0f, 0f, 3.5f), 148f, 2.85f, 1.95f);
            }
            else if (stage == 2)
            {
                Spawn("Art/Monsters/coldbone-shieldguard-v2", center + new Vector3(-3.6f, 0f, 2f), 185f, 2.15f, 2.25f);
                Spawn("Art/Monsters/coldbone-shieldguard-v2", center + new Vector3(3.6f, 0f, 2f), 185f, 2.15f, 2.25f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(0f, 0f, 4.2f), 165f, 2.9f, 1.95f);
            }
            else
            {
                Spawn("Art/Monsters/blue-ash-juggernaut-v2", center + new Vector3(0f, 0f, 4f), 520f, 1.65f, 3.8f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(-4.3f, 0f, 1.5f), 155f, 3.55f, 1.95f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(4.3f, 0f, 1.5f), 155f, 3.55f, 1.95f);
            }
        }

        private void CompleteWardflameEscort()
        {
            DemoDirector.SpawnShockwave(oathLantern.position, new Color(0.35f, 0.9f, 1f));
            Destroy(oathLantern.gameObject, 0.35f);
            oathLantern = null;
            phase = Phase.ArchiveApproach;
            ZoneName = "THE BLACK ARCHIVE";
            ObjectiveTitle = "THE FORBIDDEN INDEX";
            ObjectiveDetail = "Follow the ward-flame into the buried archive";
            SetCheckpoint(new Vector3(0f, 0.05f, 107f));
        }

        private Transform NearestArchiveRecord => archiveRecords.Where(record => record != null).OrderBy(record => Vector3.Distance(player.position, record.position)).FirstOrDefault();
        private float NearestArchiveRecordDistance => NearestArchiveRecord != null ? Vector3.Distance(player.position, NearestArchiveRecord.position) : float.MaxValue;

        private void BeginArchiveCipher()
        {
            phase = Phase.ArchiveCipher;
            ZoneName = "THE BLACK ARCHIVE";
            archiveCorrectRecord = stormglassCovenant ? 0 : 2;
            archiveFailures = 0;
            archivePunishmentActive = false;
            archiveRecords.Clear();
            ObjectiveTitle = "THE INDEX LIES";
            ObjectiveDetail = stormglassCovenant ? "Read the record where the first storm sleeps" : "Read the record where the last ember endures";
            archiveRecords.Add(DemoDirector.CreateCovenantShrine("Record of First Storm", "Art/Props/ashen-echo-monolith-v1", new Vector3(-5f, 0.04f, 114f), 3.45f, new Color(0.24f, 0.76f, 1f), "FIRST STORM"));
            archiveRecords.Add(DemoDirector.CreateCovenantShrine("Record of Hollow Crown", "Art/Props/ashen-echo-monolith-v1", new Vector3(0f, 0.04f, 117f), 3.45f, new Color(0.62f, 0.32f, 1f), "HOLLOW CROWN"));
            archiveRecords.Add(DemoDirector.CreateCovenantShrine("Record of Last Ember", "Art/Props/ashen-echo-monolith-v1", new Vector3(5f, 0.04f, 114f), 3.45f, new Color(1f, 0.3f, 0.06f), "LAST EMBER"));
            SetCheckpoint(new Vector3(0f, 0.05f, 110f));
        }

        private void ReadArchiveRecord(int recordIndex)
        {
            if (phase != Phase.ArchiveCipher || archivePunishmentActive || recordIndex < 0) return;
            AudioDirector.PlaySelect();
            var selected = archiveRecords[recordIndex];
            DemoDirector.SpawnShockwave(selected.position, recordIndex == archiveCorrectRecord ? new Color(0.3f, 0.82f, 1f) : new Color(0.88f, 0.08f, 0.16f));
            if (recordIndex == archiveCorrectRecord)
            {
                foreach (var record in archiveRecords)
                {
                    if (record != null) Destroy(record.gameObject, 0.35f);
                }
                archiveRecords.Clear();
                CaptureEncounterGrowth();
                phase = Phase.ArchivePurge;
                archivePurgeWave = 1;
                SpawnArchivePurgeWave(archivePurgeWave);
                return;
            }

            archiveFailures++;
            archivePunishmentActive = true;
            ObjectiveTitle = "A FALSE HISTORY AWAKENS";
            ObjectiveDetail = $"Erase the archive's lie  •  false records {archiveFailures}";
            var center = selected.position;
            Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(-2.8f, 0f, 1.8f), 150f, 2.9f, 1.95f);
            Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(2.8f, 0f, 1.8f), 150f, 2.9f, 1.95f);
            Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(0f, 0f, 3.8f), 145f, 3.55f, 1.95f);
        }

        private void RestoreArchiveCipher()
        {
            archivePunishmentActive = false;
            ObjectiveTitle = "THE INDEX LIES";
            ObjectiveDetail = stormglassCovenant ? "Read the record where the first storm sleeps" : "Read the record where the last ember endures";
        }

        private void SpawnArchivePurgeWave(int wave)
        {
            ObjectiveTitle = $"PURGE THE BLACK INDEX  •  {wave}/3";
            ObjectiveDetail = wave == 1 ? "Hold the western catalogue under collapse" : wave == 2 ? "Break the advancing censor line" : "Survive the archive's final redaction";
            SetCheckpoint(new Vector3(0f, 0.05f, 119f + wave * 2f));
            var center = new Vector3(0f, 0.05f, 120f + wave * 3f);
            if (wave == 1)
            {
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(-4.4f, 0f, 0f), 155f, 3.6f, 1.95f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(4.4f, 0f, 0f), 155f, 3.6f, 1.95f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(0f, 0f, 3.2f), 175f, 2.95f, 2f);
            }
            else if (wave == 2)
            {
                Spawn("Art/Monsters/coldbone-shieldguard-v2", center + new Vector3(-3.6f, 0f, 1f), 225f, 2.2f, 2.3f);
                Spawn("Art/Monsters/coldbone-shieldguard-v2", center + new Vector3(3.6f, 0f, 1f), 225f, 2.2f, 2.3f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(-1.6f, 0f, 4f), 185f, 3f, 2f);
                Spawn("Art/Monsters/bloodbound-fallen-v2", center + new Vector3(1.6f, 0f, 4f), 185f, 3f, 2f);
            }
            else
            {
                Spawn("Art/Monsters/blue-ash-juggernaut-v2", center + new Vector3(0f, 0f, 3.2f), 590f, 1.68f, 3.9f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(-4.6f, 0f, 0.5f), 175f, 3.65f, 2f);
                Spawn("Art/Monsters/blood-ash-hound-v2", center + new Vector3(4.6f, 0f, 0.5f), 175f, 3.65f, 2f);
            }
            StartCoroutine(ArchiveCollapseRoutine(++archiveCollapseRunId, wave));
        }

        private System.Collections.IEnumerator ArchiveCollapseRoutine(int runId, int wave)
        {
            yield return new WaitForSecondsRealtime(1.1f);
            var safeLanes = wave == 1 ? new[] { 1, 2 } : wave == 2 ? new[] { 0, 2, 1 } : new[] { 2, 0, 1, 0 };
            foreach (var safeLane in safeLanes)
            {
                if (phase != Phase.ArchivePurge || runId != archiveCollapseRunId) yield break;
                var impactZ = Mathf.Clamp(player.position.z, 119f, 132f);
                for (var lane = 0; lane < 3; lane++)
                {
                    if (lane == safeLane) continue;
                    var hazard = new GameObject($"Archive Collapse {wave} Lane {lane}", typeof(AshfallHazard)).GetComponent<AshfallHazard>();
                    hazard.Configure(new Vector3((lane - 1) * 4f, 0.05f, impactZ), playerController);
                }
                yield return new WaitForSecondsRealtime(2.25f);
            }
        }

        private void BeginArchiveCurator()
        {
            CaptureEncounterGrowth();
            ++archiveCollapseRunId;
            phase = Phase.ArchiveCurator;
            ZoneName = "THE REDACTED CHAMBER";
            ObjectiveTitle = "THE BLACK ARCHIVE CURATOR";
            ObjectiveDetail = "Force the keeper to reveal its forbidden judgment";
            curatorSecondJudgment = false;
            activeAnchors.Clear();
            archiveCurator = Spawn("Art/Monsters/black-archive-curator-v1", new Vector3(0f, 0.05f, 136f), 1120f, 1.72f, 4.8f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(-4.4f, 0.05f, 133f), 205f, 2.2f, 2.3f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(4.4f, 0.05f, 133f), 205f, 2.2f, 2.3f);
            SetCheckpoint(new Vector3(0f, 0.05f, 131f));
        }

        private void UpdateArchiveCurator()
        {
            if (archiveCurator != null && !curatorSecondJudgment)
            {
                var health = archiveCurator.GetComponent<Nightfall3.Combat.Health>();
                if (health != null && health.Current <= health.Maximum * 0.52f)
                {
                    curatorSecondJudgment = true;
                    archiveCurator.EnableWardShield();
                    ObjectiveTitle = "SECOND JUDGMENT  •  SEALED IN INK";
                    ObjectiveDetail = "Shatter three living annotations";
                    SpawnArchiveAnnotation(new Vector3(-4.8f, 0.05f, 136f));
                    SpawnArchiveAnnotation(new Vector3(4.8f, 0.05f, 136f));
                    SpawnArchiveAnnotation(new Vector3(0f, 0.05f, 139.5f));
                    Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-3.2f, 0.05f, 134f), 190f, 3f, 2f);
                    Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(3.2f, 0.05f, 134f), 190f, 3f, 2f);
                }
                return;
            }
            if (archiveCurator == null && activeEnemies.Count == 0 && activeAnchors.All(anchor => anchor == null)) CompleteArchiveCurator();
        }

        private void SpawnArchiveAnnotation(Vector3 position)
        {
            activeAnchors.Add(DemoDirector.CreateWardAnchor(position, OnArchiveAnnotationDestroyed));
        }

        private void OnArchiveAnnotationDestroyed(WardAnchor anchor)
        {
            activeAnchors.Remove(anchor);
            var remaining = activeAnchors.Count(active => active != null);
            if (remaining > 0)
            {
                ObjectiveDetail = $"Shatter the remaining annotations  •  {remaining}";
                return;
            }
            archiveCurator?.BreakWardShield();
            ObjectiveTitle = "THE CURATOR IS UNWRITTEN";
            ObjectiveDetail = "End the forbidden record";
        }

        private void CompleteArchiveCurator()
        {
            phase = Phase.BossApproach;
            ZoneName = "THRONE ANTECHAMBER";
            ObjectiveTitle = "HEART OF THE SIEGE";
            ObjectiveDetail = "Enter the throne court and confront its master";
            SetCheckpoint(new Vector3(0f, 0.05f, 141f));
        }

        private void BeginWardRitual()
        {
            CaptureEncounterGrowth();
            phase = Phase.WardRitual;
            ZoneName = "THE COLD WARD";
            ObjectiveTitle = "THREE SEALS OF BLUE ASH";
            ObjectiveDetail = "Shatter the ward anchors under pursuit";
            activeAnchors.Clear();
            SpawnAnchor(new Vector3(-3.4f, 0.05f, 47.2f));
            SpawnAnchor(new Vector3(3.4f, 0.05f, 48.5f));
            SpawnAnchor(new Vector3(0f, 0.05f, 51f));
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-5.2f, 0.05f, 48.8f), 92f, 2.75f, 1.9f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(5f, 0.05f, 50f), 116f, 2.1f, 2.2f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(0f, 0.05f, 52.4f), 88f, 3.4f, 1.9f);
        }

        private void SpawnAnchor(Vector3 position)
        {
            activeAnchors.Add(DemoDirector.CreateWardAnchor(position, OnAnchorDestroyed));
        }

        private void OnAnchorDestroyed(WardAnchor anchor)
        {
            activeAnchors.Remove(anchor);
        }

        private EnemyController Spawn(string resource, Vector3 position, float health, float speed, float height)
        {
            var enemy = DemoDirector.CreateEnemy(player, resource, position, health, speed, height);
            activeEnemies.Add(enemy);
            return enemy;
        }

        public int RemainingEnemies => activeEnemies.Count(enemy => enemy != null) + activeAnchors.Count(anchor => anchor != null);
        public string PhaseId => phase.ToString();
        public bool ReachedBossApproach => phase == Phase.BossApproach;
        public bool IsComplete => phase == Phase.Complete;

        private void BeginBossFight()
        {
            CaptureEncounterGrowth();
            phase = Phase.BossFight;
            ZoneName = "CASTELLAN'S COURT";
            ObjectiveTitle = "THE ASHEN CASTELLAN";
            ObjectiveDetail = "Survive the three judgments";
            boss = DemoDirector.CreateBoss(player, new Vector3(0f, 0.05f, 146f));
            boss.Defeated += OfferBossReward;
        }

        private void OfferBossReward()
        {
            phase = Phase.RelicChoice;
            ZoneName = "CASTELLAN'S FALL";
            ObjectiveTitle = "THREE RELICS REMAIN";
            ObjectiveDetail = "Choose one legacy to carry beyond Act I";
            relicAltars.Clear();
            relicAltars.Add(DemoDirector.CreateCovenantShrine("Storm Crown", "Art/Relics/storm-crown-v1", new Vector3(-4.3f, 0.04f, 146f), 2.75f, new Color(0.22f, 0.78f, 1f), "STORM CROWN", 3.65f));
            relicAltars.Add(DemoDirector.CreateCovenantShrine("Frostheart", "Art/Relics/frostheart-v1", new Vector3(0f, 0.04f, 148f), 3.15f, new Color(0.48f, 0.58f, 1f), "FROSTHEART", 3.65f));
            relicAltars.Add(DemoDirector.CreateCovenantShrine("Ember Aegis", "Art/Relics/ember-aegis-v1", new Vector3(4.3f, 0.04f, 146f), 3.2f, new Color(1f, 0.3f, 0.06f), "EMBER AEGIS", 3.65f));
        }

        private Transform NearestRelic => relicAltars.Where(relic => relic != null).OrderBy(relic => Vector3.Distance(player.position, relic.position)).FirstOrDefault();
        private float NearestRelicDistance => NearestRelic != null ? Vector3.Distance(player.position, NearestRelic.position) : float.MaxValue;

        private void ChooseRelic(int relic)
        {
            if (phase != Phase.RelicChoice || relic < 0) return;
            playerController?.ApplyFinalRelic(relic);
            AudioDirector.PlayPickup(true);
            var selectedPosition = relicAltars[relic].position;
            DemoDirector.SpawnShockwave(selectedPosition, relic == 2 ? new Color(1f, 0.3f, 0.06f) : new Color(0.3f, 0.78f, 1f));
            foreach (var altar in relicAltars)
            {
                if (altar != null) Destroy(altar.gameObject, 0.35f);
            }
            phase = Phase.ReturnPortal;
            ObjectiveTitle = $"{playerController?.FinalRelicName ?? "RELIC"} CLAIMED";
            ObjectiveDetail = "Enter the Emberwatch return gate";
            returnPortal = DemoDirector.CreateCovenantShrine("Emberwatch Return Gate", "Art/Props/exit_gate", new Vector3(0f, 0.04f, 150f), 4.6f, new Color(0.35f, 0.82f, 1f), "RETURN TO EMBERWATCH");
        }

        private void CompleteDemo()
        {
            if (phase != Phase.ReturnPortal) return;
            if (returnPortal != null) Destroy(returnPortal.gameObject, 0.2f);
            playerController?.TeleportTo(new Vector3(0f, 0.05f, -8.6f));
            phase = Phase.Complete;
            ZoneName = "EMBERWATCH CAMP";
            ObjectiveTitle = "ACT I  •  THE GATE REMEMBERS";
            ObjectiveDetail = "The Ashen Approach is reclaimed";
        }

        private void SetCheckpoint(Vector3 position)
        {
            if (playerController != null) playerController.RespawnPoint = position;
        }

        private void RestartCurrentEncounter()
        {
            if (playerController != null && hasEncounterGrowth) playerController.RestoreGrowth(encounterGrowth);
            ClearEncounterActors();
            restartingEncounter = true;
            switch (phase)
            {
                case Phase.GateFight:
                    BeginGateFight();
                    break;
                case Phase.CovenantTrial:
                    BeginCovenantTrial();
                    break;
                case Phase.CausewayFight:
                    BeginCausewayFight();
                    break;
                case Phase.EchoHunt:
                    echoWaveActive = false;
                    StartEchoWave();
                    break;
                case Phase.WardRitual:
                    BeginWardRitual();
                    break;
                case Phase.SanctumDefense:
                    SpawnDefenseWave(defenseWave);
                    break;
                case Phase.AshfallGauntlet:
                    BeginAshfallGauntlet();
                    break;
                case Phase.EliteFight:
                    BeginEliteFight();
                    break;
                case Phase.WardflameEscort:
                    if (oathLantern != null) oathLantern.position = new Vector3(0f, 0.04f, escortCheckpointZ);
                    if (escortStage > 0) SpawnEscortWave(escortStage);
                    break;
                case Phase.ArchiveCipher:
                    foreach (var record in archiveRecords)
                    {
                        if (record != null) Destroy(record.gameObject);
                    }
                    BeginArchiveCipher();
                    break;
                case Phase.ArchivePurge:
                    SpawnArchivePurgeWave(archivePurgeWave);
                    break;
                case Phase.ArchiveCurator:
                    BeginArchiveCurator();
                    break;
                case Phase.BossFight:
                    BeginBossFight();
                    break;
                case Phase.RelicChoice:
                    OfferBossReward();
                    break;
            }
            restartingEncounter = false;
        }

        private void CaptureEncounterGrowth()
        {
            if (restartingEncounter || playerController == null) return;
            encounterGrowth = playerController.CaptureGrowth();
            hasEncounterGrowth = true;
        }

        private void ClearEncounterActors()
        {
            foreach (var enemy in activeEnemies)
            {
                if (enemy != null) Destroy(enemy.gameObject);
            }
            activeEnemies.Clear();
            foreach (var anchor in activeAnchors)
            {
                if (anchor != null) Destroy(anchor.gameObject);
            }
            activeAnchors.Clear();
            foreach (var pickup in FindObjectsByType<LootPickup>(FindObjectsSortMode.None))
            {
                if (pickup != null) Destroy(pickup.gameObject);
            }
            if (boss != null) Destroy(boss.gameObject);
            boss = null;
        }

        private void OnDestroy()
        {
            if (playerController != null) playerController.Respawned -= RestartCurrentEncounter;
        }
    }
}
