using System.Collections;
using System.Linq;
using Nightfall3.Combat;
using Nightfall3.Audio;
using UnityEngine;

namespace Nightfall3.Actors
{
    [RequireComponent(typeof(CharacterController), typeof(Health))]
    public sealed class PlayerController : MonoBehaviour
    {
        private CharacterController character;
        private float nextAttack;
        private bool attacking;
        private Vector2 touchOrigin;
        private int movementFinger = -1;
        private Vector2 touchMove;
        private Vector3 facing = Vector3.forward;
        private readonly float[] cooldownEnds = new float[4];

        public Health Health { get; private set; }
        public int Level { get; private set; } = 1;
        public int Experience { get; private set; }
        public float SpellPower { get; private set; } = 1f;

        private void Awake()
        {
            character = GetComponent<CharacterController>();
            Health = GetComponent<Health>();
            Health.Configure(120f);
        }

        private void Update()
        {
            ReadTouchInput();
            var input = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (touchMove.sqrMagnitude > input.sqrMagnitude) input = touchMove;
            var move = new Vector3(input.x, 0f, input.y).normalized;
            if (move.sqrMagnitude > 0.01f) facing = move;
            if (!attacking) character.Move(move * (CombatTuning.PlayerMoveSpeed * Time.deltaTime));

            if (Input.GetKeyDown(KeyCode.Alpha1) || Input.GetKeyDown(KeyCode.Space)) CastArcBurst();
            if (Input.GetKeyDown(KeyCode.Alpha2)) CastStaticField();
            if (Input.GetKeyDown(KeyCode.Alpha3)) CastTeleport();
            if (Input.GetKeyDown(KeyCode.Alpha4)) CastFrozenOrb();
            if (Time.time >= nextAttack) TryBasicAttack();
        }

        private void ReadTouchInput()
        {
            touchMove = Vector2.zero;
            foreach (var touch in Input.touches)
            {
                if (touch.phase == TouchPhase.Began && touch.position.x < Screen.width * 0.48f && movementFinger < 0)
                {
                    movementFinger = touch.fingerId;
                    touchOrigin = touch.position;
                }
                if (touch.fingerId == movementFinger)
                {
                    if (touch.phase is TouchPhase.Ended or TouchPhase.Canceled)
                    {
                        movementFinger = -1;
                        continue;
                    }
                    touchMove = Vector2.ClampMagnitude((touch.position - touchOrigin) / 82f, 1f);
                }
                if (touch.phase == TouchPhase.Began && touch.position.x > Screen.width * 0.68f && touch.position.y < Screen.height * 0.42f)
                    CastArcBurst();
            }
        }

        private void TryBasicAttack()
        {
            var target = FindTargets()
                .OrderBy(enemy => (enemy.TargetTransform.position - transform.position).sqrMagnitude)
                .FirstOrDefault();
            if (target == null || Vector3.Distance(transform.position, target.TargetTransform.position) > CombatTuning.BasicAttackRange) return;
            StartCoroutine(BasicAttackRoutine(target));
        }

        private IEnumerator BasicAttackRoutine(ICombatTarget target)
        {
            attacking = true;
            nextAttack = Time.time + CombatTuning.BasicAttackInterval;
            var start = transform.localScale;
            transform.localScale = new Vector3(start.x * 0.9f, start.y * 1.06f, start.z);
            yield return new WaitForSeconds(0.085f);
            if (target != null && !target.IsDead)
            {
                var critical = Random.value < 0.16f;
                DemoDirector.SpawnArcProjectile(transform.position + Vector3.up * 0.9f, target, CombatTuning.BasicAttackDamage * SpellPower * (critical ? 1.65f : 1f), critical);
            }
            transform.localScale = start;
            yield return new WaitForSeconds(0.14f);
            attacking = false;
        }

        public void CastArcBurst()
        {
            if (!BeginSkill(0, CombatTuning.ChainLightningCooldown)) return;
            AudioDirector.PlaySkill(1.08f);
            StartCoroutine(ArcBurstRoutine());
        }

        private IEnumerator ArcBurstRoutine()
        {
            attacking = true;
            var ring = DemoDirector.CreateGroundRing(transform.position, CombatTuning.ArcBurstRadius, new Color(0.2f, 0.72f, 1f, 0.5f));
            yield return new WaitForSeconds(0.18f);
            foreach (var enemy in FindTargets())
            {
                if (Vector3.Distance(transform.position, enemy.TargetTransform.position) <= CombatTuning.ArcBurstRadius)
                    enemy.ReceiveHit(CombatTuning.ArcBurstDamage * SpellPower, transform.position, true);
            }
            Destroy(ring, 0.16f);
            yield return new WaitForSeconds(0.28f);
            attacking = false;
        }

        public void CastStaticField()
        {
            if (!BeginSkill(1, CombatTuning.StaticFieldCooldown)) return;
            AudioDirector.PlaySkill(0.78f);
            StartCoroutine(StaticFieldRoutine());
        }

        private IEnumerator StaticFieldRoutine()
        {
            attacking = true;
            var field = DemoDirector.CreateGroundRing(transform.position, 4.8f, new Color(0.52f, 0.22f, 0.95f, 0.5f));
            yield return new WaitForSeconds(0.26f);
            foreach (var enemy in FindTargets())
            {
                if (Vector3.Distance(transform.position, enemy.TargetTransform.position) <= 4.8f)
                    enemy.ReceiveHit(32f * SpellPower, transform.position, false);
            }
            DemoDirector.SpawnShockwave(transform.position, new Color(0.58f, 0.26f, 1f));
            Destroy(field, 0.28f);
            yield return new WaitForSeconds(0.22f);
            attacking = false;
        }

        public void CastTeleport()
        {
            if (!BeginSkill(2, CombatTuning.TeleportCooldown)) return;
            AudioDirector.PlaySkill(1.28f);
            StartCoroutine(TeleportRoutine());
        }

        private IEnumerator TeleportRoutine()
        {
            attacking = true;
            DemoDirector.SpawnAfterimage(transform.position, new Color(0.46f, 0.25f, 1f));
            yield return new WaitForSecondsRealtime(0.05f);
            character.enabled = false;
            transform.position += facing.normalized * 4.6f;
            character.enabled = true;
            DemoDirector.SpawnShockwave(transform.position, new Color(0.36f, 0.65f, 1f));
            yield return new WaitForSeconds(0.12f);
            attacking = false;
        }

        public void CastFrozenOrb()
        {
            if (!BeginSkill(3, CombatTuning.FrozenOrbCooldown)) return;
            AudioDirector.PlaySkill(0.94f);
            StartCoroutine(FrozenOrbRoutine());
        }

        private IEnumerator FrozenOrbRoutine()
        {
            attacking = true;
            yield return new WaitForSeconds(0.16f);
            for (var step = 1; step <= 4; step++)
            {
                var center = transform.position + facing.normalized * (step * 1.65f);
                DemoDirector.SpawnShockwave(center, new Color(0.28f, 0.82f, 1f));
                foreach (var enemy in FindTargets())
                {
                    if (Vector3.Distance(center, enemy.TargetTransform.position) <= 1.25f)
                        enemy.ReceiveHit(18f * SpellPower, transform.position, step == 4);
                }
                yield return new WaitForSeconds(0.075f);
            }
            yield return new WaitForSeconds(0.18f);
            attacking = false;
        }

        public float GetCooldownNormalized(int skill)
        {
            var duration = skill switch
            {
                0 => CombatTuning.ChainLightningCooldown,
                1 => CombatTuning.StaticFieldCooldown,
                2 => CombatTuning.TeleportCooldown,
                3 => CombatTuning.FrozenOrbCooldown,
                _ => 1f
            };
            return Mathf.Clamp01((cooldownEnds[skill] - Time.time) / duration);
        }

        private bool BeginSkill(int skill, float cooldown)
        {
            if (attacking || Time.time < cooldownEnds[skill]) return false;
            cooldownEnds[skill] = Time.time + cooldown;
            return true;
        }

        private static ICombatTarget[] FindTargets()
        {
            return FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None)
                .OfType<ICombatTarget>()
                .Where(target => !target.IsDead)
                .ToArray();
        }

        public void GrantRelic(float powerGain, int experienceGain)
        {
            SpellPower += Mathf.Max(0f, powerGain);
            Experience += Mathf.Max(0, experienceGain);
            while (Experience >= Level * 100)
            {
                Experience -= Level * 100;
                Level++;
                SpellPower += 0.08f;
                Health.Configure(Health.Maximum + 18f);
            }
        }
    }
}
