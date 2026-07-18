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
            AdvanceCauseway,
            CausewayFight,
            AdvanceWard,
            WardRitual,
            AdvanceElite,
            EliteFight,
            BossApproach,
            BossFight,
            ClaimReward,
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

        public string ZoneName { get; private set; } = "EMBERWATCH CAMP";
        public string ObjectiveTitle { get; private set; } = "THE SEALED APPROACH";
        public string ObjectiveDetail { get; private set; } = "Speak with Mara, Ash Warden";
        public bool CanInteract => phase == Phase.Briefing && player != null && warden != null && Vector3.Distance(player.position, warden.position) <= 3.6f;

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
            if (phase != Phase.Briefing) return;
            AudioDirector.PlaySelect();
            BeginGateFight();
        }

        private void Update()
        {
            if (player == null) return;
            if (phase == Phase.Briefing)
            {
                if ((CanInteract && Input.GetKeyDown(KeyCode.E)) || player.position.z > -7.5f) BeginGateFight();
                return;
            }

            activeEnemies.RemoveAll(enemy => enemy == null);
            switch (phase)
            {
                case Phase.GateFight when activeEnemies.Count == 0:
                    if (gateWave == 1) BeginGateReinforcements();
                    else
                    {
                        phase = Phase.AdvanceCauseway;
                        ZoneName = "ASHEN APPROACH";
                        ObjectiveTitle = "BEYOND THE BLACK GATE";
                        ObjectiveDetail = "Advance to the broken causeway";
                        SetCheckpoint(new Vector3(0f, 0.05f, 5.5f));
                    }
                    break;
                case Phase.AdvanceCauseway when player.position.z >= 10f:
                    BeginCausewayFight();
                    break;
                case Phase.CausewayFight when activeEnemies.Count == 0:
                    phase = Phase.AdvanceWard;
                    ObjectiveTitle = "THE COLD WARD";
                    ObjectiveDetail = "Follow the blue seals to the warden elite";
                    SetCheckpoint(new Vector3(0f, 0.05f, 17.5f));
                    break;
                case Phase.AdvanceWard when player.position.z >= 20f:
                    BeginWardRitual();
                    break;
                case Phase.WardRitual when activeEnemies.Count == 0 && activeAnchors.All(anchor => anchor == null):
                    phase = Phase.AdvanceElite;
                    ObjectiveTitle = "THE INNER PROCESSION";
                    ObjectiveDetail = "Cross the broken seals to the blue-ash warden";
                    SetCheckpoint(new Vector3(0f, 0.05f, 24.5f));
                    break;
                case Phase.AdvanceElite when player.position.z >= 25.5f:
                    BeginEliteFight();
                    break;
                case Phase.EliteFight when activeEnemies.Count == 0:
                    phase = Phase.BossApproach;
                    ZoneName = "THRONE ANTECHAMBER";
                    ObjectiveTitle = "HEART OF THE SIEGE";
                    ObjectiveDetail = "Enter the antechamber and confront its master";
                    SetCheckpoint(new Vector3(0f, 0.05f, 29.2f));
                    break;
                case Phase.BossApproach when player.position.z >= 30f:
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
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-4.5f, 0.05f, 13f), 78f, 2.7f, 1.85f);
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(3.9f, 0.05f, 14.2f), 78f, 2.7f, 1.85f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(-1.8f, 0.05f, 15.8f), 96f, 2f, 2.15f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(2.2f, 0.05f, 16.6f), 96f, 2f, 2.15f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-5.2f, 0.05f, 17.5f), 68f, 3.35f, 1.8f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(5f, 0.05f, 18.1f), 68f, 3.35f, 1.8f);
        }

        private void BeginEliteFight()
        {
            CaptureEncounterGrowth();
            phase = Phase.EliteFight;
            ObjectiveTitle = "WARDEN OF BLUE ASH";
            ObjectiveDetail = "Break the elite and its hunting pair";
            Spawn("Art/Monsters/blue-ash-juggernaut-v2", new Vector3(0f, 0.05f, 28.8f), 620f, 1.6f, 3.9f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(-4.2f, 0.05f, 27.2f), 148f, 3.4f, 1.95f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(4.2f, 0.05f, 27.2f), 148f, 3.4f, 1.95f);
        }

        private void BeginWardRitual()
        {
            CaptureEncounterGrowth();
            phase = Phase.WardRitual;
            ZoneName = "THE COLD WARD";
            ObjectiveTitle = "THREE SEALS OF BLUE ASH";
            ObjectiveDetail = "Shatter the ward anchors under pursuit";
            activeAnchors.Clear();
            SpawnAnchor(new Vector3(-3.4f, 0.05f, 21.6f));
            SpawnAnchor(new Vector3(3.4f, 0.05f, 22.8f));
            SpawnAnchor(new Vector3(0f, 0.05f, 24.8f));
            Spawn("Art/Monsters/bloodbound-fallen-v2", new Vector3(-5.2f, 0.05f, 23f), 92f, 2.75f, 1.9f);
            Spawn("Art/Monsters/coldbone-shieldguard-v2", new Vector3(5f, 0.05f, 24f), 116f, 2.1f, 2.2f);
            Spawn("Art/Monsters/blood-ash-hound-v2", new Vector3(0f, 0.05f, 26.2f), 88f, 3.4f, 1.9f);
        }

        private void SpawnAnchor(Vector3 position)
        {
            activeAnchors.Add(DemoDirector.CreateWardAnchor(position, OnAnchorDestroyed));
        }

        private void OnAnchorDestroyed(WardAnchor anchor)
        {
            activeAnchors.Remove(anchor);
        }

        private void Spawn(string resource, Vector3 position, float health, float speed, float height)
        {
            activeEnemies.Add(DemoDirector.CreateEnemy(player, resource, position, health, speed, height));
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
            boss = DemoDirector.CreateBoss(player, new Vector3(0f, 0.05f, 33.2f));
            boss.Defeated += OfferBossReward;
        }

        private void OfferBossReward()
        {
            phase = Phase.ClaimReward;
            ObjectiveTitle = "THE CASTELLAN'S RELIC";
            ObjectiveDetail = "Claim the ember-bound wardstone";
            var position = boss != null ? boss.transform.position : player.position + Vector3.forward;
            DemoDirector.SpawnLootPickup(position, player.GetComponent<PlayerController>(), true, CompleteDemo);
        }

        private void CompleteDemo()
        {
            phase = Phase.Complete;
            ObjectiveTitle = "THE GATE REMEMBERS";
            ObjectiveDetail = "Demo complete  •  Return to Emberwatch in Act I";
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
                case Phase.CausewayFight:
                    BeginCausewayFight();
                    break;
                case Phase.WardRitual:
                    BeginWardRitual();
                    break;
                case Phase.EliteFight:
                    BeginEliteFight();
                    break;
                case Phase.BossFight:
                    BeginBossFight();
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
