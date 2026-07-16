using System.Collections.Generic;
using System.Linq;
using Nightfall3.Actors;
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
            EliteFight,
            BossApproach,
            BossFight,
            ClaimReward,
            Complete
        }

        private readonly List<EnemyController> activeEnemies = new();
        private Phase phase;
        private Transform player;
        private Transform warden;
        private BossController boss;

        public string ZoneName { get; private set; } = "EMBERWATCH CAMP";
        public string ObjectiveTitle { get; private set; } = "THE SEALED APPROACH";
        public string ObjectiveDetail { get; private set; } = "Speak with Mara, Ash Warden";
        public bool CanInteract => phase == Phase.Briefing && player != null && warden != null && Vector3.Distance(player.position, warden.position) <= 3.6f;

        public void Configure(Transform playerTransform, Transform wardenTransform)
        {
            player = playerTransform;
            warden = wardenTransform;
        }

        public void Interact()
        {
            if (phase != Phase.Briefing) return;
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
                    phase = Phase.AdvanceCauseway;
                    ZoneName = "ASHEN APPROACH";
                    ObjectiveTitle = "BEYOND THE BLACK GATE";
                    ObjectiveDetail = "Advance to the broken causeway";
                    break;
                case Phase.AdvanceCauseway when player.position.z >= 10f:
                    BeginCausewayFight();
                    break;
                case Phase.CausewayFight when activeEnemies.Count == 0:
                    phase = Phase.AdvanceWard;
                    ObjectiveTitle = "THE COLD WARD";
                    ObjectiveDetail = "Follow the blue seals to the warden elite";
                    break;
                case Phase.AdvanceWard when player.position.z >= 20f:
                    BeginEliteFight();
                    break;
                case Phase.EliteFight when activeEnemies.Count == 0:
                    phase = Phase.BossApproach;
                    ZoneName = "THRONE ANTECHAMBER";
                    ObjectiveTitle = "HEART OF THE SIEGE";
                    ObjectiveDetail = "Enter the antechamber and confront its master";
                    break;
                case Phase.BossApproach when player.position.z >= 26f:
                    BeginBossFight();
                    break;
            }
        }

        private void BeginGateFight()
        {
            phase = Phase.GateFight;
            ZoneName = "ASHEN APPROACH";
            ObjectiveTitle = "BLOODBOUND AT THE GATE";
            ObjectiveDetail = "Break the first war pack";
            Spawn("Art/Monsters/Fallen", new Vector3(-3.6f, 0.05f, -1.8f), 64f, 2.55f, 1.75f);
            Spawn("Art/Monsters/Skeleton", new Vector3(2.8f, 0.05f, -0.4f), 82f, 1.9f, 2.05f);
            Spawn("Art/Monsters/Hound", new Vector3(4.3f, 0.05f, 1.2f), 58f, 3.2f, 1.65f);
            Spawn("Art/Monsters/Brute", new Vector3(-2.2f, 0.05f, 2.8f), 185f, 1.45f, 3.15f);
        }

        private void BeginCausewayFight()
        {
            phase = Phase.CausewayFight;
            ObjectiveTitle = "THE RAVENING LINE";
            ObjectiveDetail = "Destroy the ambush on the causeway";
            Spawn("Art/Monsters/Fallen", new Vector3(-4.5f, 0.05f, 13f), 78f, 2.7f, 1.75f);
            Spawn("Art/Monsters/Fallen", new Vector3(3.9f, 0.05f, 14.2f), 78f, 2.7f, 1.75f);
            Spawn("Art/Monsters/Skeleton", new Vector3(-1.8f, 0.05f, 15.8f), 96f, 2f, 2.05f);
            Spawn("Art/Monsters/Skeleton", new Vector3(2.2f, 0.05f, 16.6f), 96f, 2f, 2.05f);
            Spawn("Art/Monsters/Hound", new Vector3(-5.2f, 0.05f, 17.5f), 68f, 3.35f, 1.65f);
            Spawn("Art/Monsters/Hound", new Vector3(5f, 0.05f, 18.1f), 68f, 3.35f, 1.65f);
        }

        private void BeginEliteFight()
        {
            phase = Phase.EliteFight;
            ObjectiveTitle = "WARDEN OF BLUE ASH";
            ObjectiveDetail = "Break the elite and its hunting pair";
            Spawn("Art/Monsters/Brute", new Vector3(0f, 0.05f, 23.8f), 520f, 1.6f, 3.65f);
            Spawn("Art/Monsters/Hound", new Vector3(-4.2f, 0.05f, 22.4f), 128f, 3.4f, 1.8f);
            Spawn("Art/Monsters/Hound", new Vector3(4.2f, 0.05f, 22.4f), 128f, 3.4f, 1.8f);
        }

        private void Spawn(string resource, Vector3 position, float health, float speed, float height)
        {
            activeEnemies.Add(DemoDirector.CreateEnemy(player, resource, position, health, speed, height));
        }

        public int RemainingEnemies => activeEnemies.Count(enemy => enemy != null);
        public string PhaseId => phase.ToString();
        public bool ReachedBossApproach => phase == Phase.BossApproach;
        public bool IsComplete => phase == Phase.Complete;

        private void BeginBossFight()
        {
            phase = Phase.BossFight;
            ZoneName = "CASTELLAN'S COURT";
            ObjectiveTitle = "THE ASHEN CASTELLAN";
            ObjectiveDetail = "Survive the three judgments";
            boss = DemoDirector.CreateBoss(player, new Vector3(0f, 0.05f, 27.8f));
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
    }
}
