using System.Collections;
using System.Linq;
using Nightfall3.Combat;
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

        public Health Health { get; private set; }

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
            if (!attacking) character.Move(move * (CombatTuning.PlayerMoveSpeed * Time.deltaTime));

            if (Input.GetKeyDown(KeyCode.Space)) CastArcBurst();
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
            var target = FindObjectsByType<EnemyController>(FindObjectsSortMode.None)
                .Where(enemy => enemy != null)
                .OrderBy(enemy => (enemy.transform.position - transform.position).sqrMagnitude)
                .FirstOrDefault();
            if (target == null || Vector3.Distance(transform.position, target.transform.position) > CombatTuning.BasicAttackRange) return;
            StartCoroutine(BasicAttackRoutine(target));
        }

        private IEnumerator BasicAttackRoutine(EnemyController target)
        {
            attacking = true;
            nextAttack = Time.time + CombatTuning.BasicAttackInterval;
            var start = transform.localScale;
            transform.localScale = new Vector3(start.x * 0.88f, start.y * 1.08f, start.z);
            yield return new WaitForSeconds(0.1f);
            if (target != null)
            {
                var critical = Random.value < 0.16f;
                target.ReceiveHit(CombatTuning.BasicAttackDamage * (critical ? 1.65f : 1f), transform.position, critical);
            }
            transform.localScale = start;
            yield return new WaitForSeconds(0.14f);
            attacking = false;
        }

        public void CastArcBurst()
        {
            if (attacking) return;
            StartCoroutine(ArcBurstRoutine());
        }

        private IEnumerator ArcBurstRoutine()
        {
            attacking = true;
            var ring = DemoDirector.CreateGroundRing(transform.position, CombatTuning.ArcBurstRadius, new Color(0.2f, 0.72f, 1f, 0.5f));
            yield return new WaitForSeconds(0.18f);
            foreach (var enemy in FindObjectsByType<EnemyController>(FindObjectsSortMode.None))
            {
                if (Vector3.Distance(transform.position, enemy.transform.position) <= CombatTuning.ArcBurstRadius)
                    enemy.ReceiveHit(CombatTuning.ArcBurstDamage, transform.position, true);
            }
            Destroy(ring, 0.16f);
            yield return new WaitForSeconds(0.28f);
            attacking = false;
        }
    }
}
