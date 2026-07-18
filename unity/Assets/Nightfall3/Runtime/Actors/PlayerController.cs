using System.Collections;
using System.Linq;
using Nightfall3.Combat;
using Nightfall3.Audio;
using Nightfall3.Presentation;
using UnityEngine;

namespace Nightfall3.Actors
{
    [RequireComponent(typeof(CharacterController), typeof(Health))]
    public sealed class PlayerController : MonoBehaviour
    {
        public readonly struct GrowthSnapshot
        {
            public GrowthSnapshot(int level, int experience, float spellPower, float maximumHealth)
            {
                Level = level;
                Experience = experience;
                SpellPower = spellPower;
                MaximumHealth = maximumHealth;
            }

            public int Level { get; }
            public int Experience { get; }
            public float SpellPower { get; }
            public float MaximumHealth { get; }
        }

        private CharacterController character;
        private float nextAttack;
        private bool attacking;
        private Vector2 touchOrigin;
        private int movementFinger = -1;
        private Vector2 touchMove;
        private Vector3 facing = Vector3.forward;
        private readonly float[] cooldownEnds = new float[4];
        private bool defeated;
        private ActorSpriteAnimator spriteAnimator;
        private float lastHealth;
        private float basicDamageMultiplier = 1f;
        private float skillDamageMultiplier = 1f;
        private float cooldownMultiplier = 1f;
        private float arcDamageMultiplier = 1f;
        private float staticDamageMultiplier = 1f;
        private float frozenDamageMultiplier = 1f;
        private float frozenCooldownMultiplier = 1f;

        public Health Health { get; private set; }
        public int Level { get; private set; } = 1;
        public int Experience { get; private set; }
        public float SpellPower { get; private set; } = 1f;
        public string CovenantName { get; private set; } = "UNBOUND";
        public string MasteryName { get; private set; } = "UNSHAPED";
        public Vector2 MovementInput { get; private set; }
        public Vector3 RespawnPoint { get; set; }
        public event System.Action Respawned;

        private void Awake()
        {
            character = GetComponent<CharacterController>();
            Health = GetComponent<Health>();
            Health.Configure(120f);
            lastHealth = Health.Current;
            Health.Changed += HandleHealthChanged;
            Health.Died += HandleDefeat;
            RespawnPoint = transform.position;
        }

        private void Update()
        {
            if (defeated) return;
            if (CinematicDirector.CombatSuppressed)
            {
                MovementInput = Vector2.zero;
                return;
            }
            ReadTouchInput();
            var input = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (touchMove.sqrMagnitude > input.sqrMagnitude) input = touchMove;
            MovementInput = Vector2.ClampMagnitude(input, 1f);
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
            MovementInput = Vector2.zero;
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
            SpriteAnimator?.PlayAttack();
            yield return new WaitForSeconds(0.085f);
            if (target != null && !target.IsDead)
            {
                var critical = Random.value < 0.16f;
                DemoDirector.SpawnArcProjectile(transform.position + Vector3.up * 0.9f, target, CombatTuning.BasicAttackDamage * SpellPower * basicDamageMultiplier * (critical ? 1.65f : 1f), critical);
            }
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
                    enemy.ReceiveHit(CombatTuning.ArcBurstDamage * SpellPower * skillDamageMultiplier * arcDamageMultiplier, transform.position, true);
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
                    enemy.ReceiveHit(32f * SpellPower * skillDamageMultiplier * staticDamageMultiplier, transform.position, false);
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
                        enemy.ReceiveHit(18f * SpellPower * skillDamageMultiplier * frozenDamageMultiplier, transform.position, step == 4);
                }
                yield return new WaitForSeconds(0.075f);
            }
            yield return new WaitForSeconds(0.18f);
            attacking = false;
        }

        public float GetCooldownNormalized(int skill)
        {
            var duration = GetCooldownDuration(skill);
            return Mathf.Clamp01((cooldownEnds[skill] - Time.time) / duration);
        }

        public float GetCooldownDuration(int skill)
        {
            var duration = skill switch
            {
                0 => CombatTuning.ChainLightningCooldown,
                1 => CombatTuning.StaticFieldCooldown,
                2 => CombatTuning.TeleportCooldown,
                3 => CombatTuning.FrozenOrbCooldown,
                _ => 1f
            };
            return duration * cooldownMultiplier * (skill == 3 ? frozenCooldownMultiplier : 1f);
        }

        private bool BeginSkill(int skill, float cooldown)
        {
            if (attacking || Time.time < cooldownEnds[skill]) return false;
            cooldownEnds[skill] = Time.time + cooldown * cooldownMultiplier * (skill == 3 ? frozenCooldownMultiplier : 1f);
            SpriteAnimator?.PlayAttack();
            return true;
        }

        private ActorSpriteAnimator SpriteAnimator => spriteAnimator != null ? spriteAnimator : spriteAnimator = GetComponentInChildren<ActorSpriteAnimator>();

        private void HandleHealthChanged(float current, float maximum)
        {
            if (current < lastHealth && current > 0f) SpriteAnimator?.PlayHit();
            lastHealth = current;
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

        public void ApplyCovenant(bool stormglass)
        {
            if (CovenantName != "UNBOUND") return;
            if (stormglass)
            {
                CovenantName = "STORMGLASS";
                skillDamageMultiplier = 1.16f;
                cooldownMultiplier = 0.88f;
            }
            else
            {
                CovenantName = "EMBERHEART";
                basicDamageMultiplier = 1.24f;
                Health.Configure(Health.Maximum + 34f);
            }
        }

        public void ApplyMastery(int mastery)
        {
            if (MasteryName != "UNSHAPED") return;
            if (mastery == 0)
            {
                MasteryName = "STORM LATTICE";
                arcDamageMultiplier = 1.3f;
                staticDamageMultiplier = 1.22f;
            }
            else
            {
                MasteryName = "FROZEN WAKE";
                frozenDamageMultiplier = 1.45f;
                frozenCooldownMultiplier = 0.76f;
            }
        }

        public GrowthSnapshot CaptureGrowth() => new(Level, Experience, SpellPower, Health.Maximum);

        public void RestoreGrowth(GrowthSnapshot snapshot)
        {
            Level = snapshot.Level;
            Experience = snapshot.Experience;
            SpellPower = snapshot.SpellPower;
            Health.Configure(snapshot.MaximumHealth);
        }

        public void ApplyKnockback(Vector3 displacement)
        {
            if (defeated || character == null) return;
            displacement.y = 0f;
            character.Move(displacement);
        }

        public void ApplyGuidedMovement(Vector3 direction, float deltaTime)
        {
            if (defeated || attacking || CinematicDirector.CombatSuppressed || character == null) return;
            direction.y = 0f;
            if (direction.sqrMagnitude <= 0.01f) return;
            facing = direction.normalized;
            character.Move(facing * (CombatTuning.PlayerMoveSpeed * Mathf.Max(0f, deltaTime)));
        }

        public void SetGuidedFacing(Vector3 direction)
        {
            direction.y = 0f;
            if (!defeated && direction.sqrMagnitude > 0.01f) facing = direction.normalized;
        }

        private void HandleDefeat()
        {
            if (!defeated) StartCoroutine(RespawnRoutine());
        }

        private IEnumerator RespawnRoutine()
        {
            defeated = true;
            attacking = false;
            movementFinger = -1;
            touchMove = Vector2.zero;
            MovementInput = Vector2.zero;
            SpriteAnimator?.SetDefeated(true);
            AudioDirector.PlayDeath(true);
            var visual = GetComponentInChildren<SpriteRenderer>();
            var originalColor = visual != null ? visual.color : Color.white;
            if (visual != null) visual.color = new Color(0.22f, 0.28f, 0.36f, 0.45f);
            Camera.main?.GetComponent<Nightfall3.Presentation.CameraRig>()?.AddTrauma(0.8f);
            yield return new WaitForSecondsRealtime(1.15f);
            character.enabled = false;
            transform.position = RespawnPoint;
            character.enabled = true;
            Health.Configure(Health.Maximum);
            if (visual != null) visual.color = originalColor;
            SpriteAnimator?.SetDefeated(false);
            DemoDirector.SpawnShockwave(transform.position, new Color(1f, 0.46f, 0.12f));
            defeated = false;
            Respawned?.Invoke();
        }
    }
}
