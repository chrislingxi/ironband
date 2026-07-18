using System.Collections;
using Nightfall3.Actors;
using Nightfall3.Audio;
using Nightfall3.Combat;
using Nightfall3.Flow;
using Nightfall3.Presentation;
using Nightfall3.UI;
using UnityEngine;

namespace Nightfall3
{
    public sealed class DemoDirector : MonoBehaviour
    {
        private static readonly Color Iron = new(0.13f, 0.12f, 0.11f);
        private static readonly Color Ash = new(0.095f, 0.085f, 0.07f);
        private static readonly Color Ember = new(1f, 0.28f, 0.06f);

        private Transform player;

        private void Awake()
        {
            if (FindFirstObjectByType<HitStopController>() == null)
                new GameObject("Hit Stop", typeof(HitStopController));

            ConfigureWorld();
            BuildEnvironment();
            player = CreatePlayer();
            CreateCamera(player);
            var warden = BuildCamp();
            var flow = new GameObject("Demo Flow", typeof(DemoFlowController)).GetComponent<DemoFlowController>();
            flow.Configure(player, warden);
            new GameObject("Audio Director", typeof(AudioDirector)).GetComponent<AudioDirector>().Configure(flow);
            DemoHud.Create(player.GetComponent<PlayerController>(), flow);
            CinematicDirector.Create(flow);
        }

        private static void ConfigureWorld()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.16f, 0.18f, 0.2f);
            RenderSettings.ambientEquatorColor = new Color(0.09f, 0.075f, 0.06f);
            RenderSettings.ambientGroundColor = new Color(0.025f, 0.022f, 0.02f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.025f, 0.028f, 0.03f);
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.018f;
            RuntimeQuality.Apply();
        }

        private void BuildEnvironment()
        {
            Random.InitState(3103);
            var key = new GameObject("Moon Key", typeof(Light)).GetComponent<Light>();
            key.type = LightType.Directional;
            key.color = new Color(0.48f, 0.58f, 0.72f);
            key.intensity = 1.25f;
            key.shadows = LightShadows.Soft;
            key.transform.rotation = Quaternion.Euler(48f, -36f, 0f);

            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "Corrupted Flagstone";
            ground.transform.position = new Vector3(0f, -0.28f, 10f);
            ground.transform.localScale = new Vector3(25f, 0.5f, 62f);
            var floorTexture = Resources.Load<Texture2D>("Art/Environment/ashen-courtyard-albedo-v1");
            if (floorTexture != null) floorTexture.wrapMode = TextureWrapMode.Repeat;
            var floorMaterial = Material(Color.white, 0.08f, 0.48f, texture: floorTexture);
            floorMaterial.mainTextureScale = new Vector2(2.4f, 3.2f);
            ground.GetComponent<Renderer>().material = floorMaterial;

            BuildProcessionalPath();
            BuildCourtyardWalls();

            for (var i = 0; i < 108; i++)
            {
                var x = Random.Range(-11f, 11f);
                var z = Random.Range(-19f, 39f);
                if (Mathf.Abs(x) < 4.8f && z < 31f) continue;
                var stone = GameObject.CreatePrimitive(i % 4 == 0 ? PrimitiveType.Cylinder : PrimitiveType.Cube);
                stone.name = "Ruin Debris";
                stone.transform.position = new Vector3(x, Random.Range(-0.02f, 0.12f), z);
                stone.transform.localScale = new Vector3(Random.Range(0.25f, 1.2f), Random.Range(0.08f, 0.35f), Random.Range(0.25f, 1.1f));
                stone.transform.rotation = Quaternion.Euler(0f, Random.Range(0f, 180f), 0f);
                stone.GetComponent<Renderer>().material = Material(Iron * Random.Range(0.72f, 1.15f), 0.08f, 0.9f);
            }

            CreateWorldArt("Ritual Altar", "Art/Props/ritual_altar", new Vector3(-5.7f, 0.04f, 18.5f), 3.2f, new Color(0.8f, 0.9f, 1f));
            CreateWorldArt("Roadside Fire", "Art/Props/campfire", new Vector3(5.9f, 0.04f, 8.8f), 2.35f, Color.white);

            for (var z = -16f; z <= 36f; z += 6.5f)
            {
                CreateTorch(new Vector3(-7.5f, 1.15f, z));
                CreateTorch(new Vector3(7.5f, 1.15f, z + 2.4f));
            }

            CreateWorldArt("Ashen Gate Facade", "Art/Environment/ashen-gate-facade-v1", new Vector3(0f, 0.05f, 36f), 8.4f, Color.white);
        }

        private static void BuildProcessionalPath()
        {
            for (var row = -11; row <= 24; row++)
            {
                for (var side = -1; side <= 1; side += 2)
                {
                    var curb = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    curb.name = "Bronze Causeway Inlay";
                    curb.transform.position = new Vector3(side * 4.45f, 0.015f, row * 1.55f);
                    curb.transform.localScale = new Vector3(0.13f, 0.05f, 1.46f);
                    curb.transform.rotation = Quaternion.Euler(0f, Random.Range(-1f, 1f), 0f);
                    curb.GetComponent<Renderer>().material = Material(new Color(0.26f, 0.16f, 0.075f) * Random.Range(0.75f, 1.12f), 0.72f, 0.42f);
                }
            }

            for (var row = -2; row <= 34; row += 4)
            {
                var sigil = CreateGroundRing(new Vector3(0f, 0.06f, row), 1.18f, new Color(0.18f, 0.56f, 0.72f, 0.52f));
                sigil.name = "Cold Ward Sigil";
            }
        }

        private static void BuildCourtyardWalls()
        {
            for (var z = -18f; z <= 39f; z += 3.2f)
            {
                for (var side = -1; side <= 1; side += 2)
                {
                    var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    wall.name = "Ashen Rampart";
                    wall.transform.position = new Vector3(side * 9.6f, Random.Range(0.75f, 1.25f), z);
                    wall.transform.localScale = new Vector3(1.25f, Random.Range(1.7f, 2.7f), 2.9f);
                    wall.GetComponent<Renderer>().material = Material(Iron * Random.Range(0.75f, 1f), 0.17f, 0.78f);
                }
            }
        }

        private static void CreateTorch(Vector3 position)
        {
            var post = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            post.name = "Iron Brazier";
            post.transform.position = position;
            post.transform.localScale = new Vector3(0.18f, 1.1f, 0.18f);
            post.GetComponent<Renderer>().material = Material(Iron, 0.65f, 0.48f);

            var light = new GameObject("Ember Light", typeof(Light)).GetComponent<Light>();
            light.transform.position = position + Vector3.up * 1.2f;
            light.type = LightType.Point;
            light.range = 7.5f;
            light.intensity = 4.2f;
            light.color = new Color(1f, 0.28f, 0.07f);
            light.shadows = LightShadows.Soft;

            var flame = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            flame.name = "Flame Core";
            flame.transform.position = light.transform.position;
            flame.transform.localScale = new Vector3(0.26f, 0.42f, 0.26f);
            flame.GetComponent<Renderer>().material = Material(Ember, 0.1f, 0.15f, Ember * 3f);
            Destroy(flame.GetComponent<Collider>());
        }

        private static void CreateWorldArt(string name, string resource, Vector3 position, float height, Color tint)
        {
            var texture = Resources.Load<Texture2D>(resource);
            if (texture == null) return;
            var sprite = Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.08f), texture.height / height);
            var visual = new GameObject(name, typeof(SpriteRenderer), typeof(BillboardActor));
            visual.transform.position = position;
            var renderer = visual.GetComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.color = tint;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        }

        private static Transform BuildCamp()
        {
            CreateWorldArt("Emberwatch Fire", "Art/Props/campfire", new Vector3(0f, 0.04f, -8.6f), 2.75f, Color.white);
            CreateWorldArt("Mara, Ash Warden", "Art/NPCs/mara-ash-warden-v2", new Vector3(-3.2f, 0.04f, -9.6f), 3.3f, Color.white);
            CreateWorldArt("Veyra, Forgekeeper", "Art/NPCs/veyra-forgekeeper-v2", new Vector3(3.4f, 0.04f, -9.5f), 3.3f, Color.white);
            CreateWorldArt("Sister Elowen", "Art/NPCs/sister-elowen-v2", new Vector3(5.45f, 0.04f, -7.2f), 3.3f, Color.white);
            CreateWorldArt("Forge Anvil", "Art/Props/blacksmith_anvil", new Vector3(5.2f, 0.04f, -8.7f), 1.75f, Color.white);
            CreateWorldLabel("MARA  •  ASH WARDEN", new Vector3(-3.2f, 3.25f, -9.6f), new Color(0.95f, 0.76f, 0.38f));
            CreateWorldLabel("VEYRA  •  FORGEKEEPER", new Vector3(3.4f, 3.25f, -9.5f), new Color(0.72f, 0.76f, 0.8f));
            CreateWorldLabel("SISTER ELOWEN", new Vector3(5.45f, 3.35f, -7.2f), new Color(0.72f, 0.76f, 0.8f));
            CreateGroundRing(new Vector3(-3.2f, 0.04f, -9.6f), 1.15f, new Color(0.9f, 0.62f, 0.16f, 0.68f));
            return GameObject.Find("Mara, Ash Warden")?.transform;
        }

        private static void CreateWorldLabel(string value, Vector3 position, Color color)
        {
            var label = new GameObject(value, typeof(TextMesh), typeof(BillboardActor));
            label.transform.position = position;
            var text = label.GetComponent<TextMesh>();
            text.text = value;
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.035f;
            text.fontSize = 44;
            text.fontStyle = FontStyle.Bold;
            text.color = color;
        }

        private static Transform CreatePlayer()
        {
            var root = new GameObject("Duskweaver", typeof(CharacterController), typeof(Health), typeof(PlayerController));
            root.transform.position = new Vector3(0f, 0.05f, -11f);
            var controller = root.GetComponent<CharacterController>();
            controller.height = 1.7f;
            controller.radius = 0.4f;
            controller.center = new Vector3(0f, 0.85f, 0f);
            var visual = CreateActorVisual(root.transform, "Art/Characters/duskweaver-idle-a-v3", 3.1f, Color.white);
            visual.gameObject.AddComponent<ActorSpriteAnimator>().ConfigureDuskweaver(root.transform, 3.1f);
            return root.transform;
        }

        private static void CreateCamera(Transform target)
        {
            var go = new GameObject("Isometric Camera", typeof(Camera), typeof(AudioListener), typeof(CameraRig));
            go.tag = "MainCamera";
            var camera = go.GetComponent<Camera>();
            camera.fieldOfView = 38f;
            camera.nearClipPlane = 0.15f;
            camera.farClipPlane = 120f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.012f, 0.014f, 0.016f);
            var rig = go.GetComponent<CameraRig>();
            rig.Target = target;
            go.transform.position = target.position + new Vector3(0f, 9.4f, -8.2f);
            go.transform.rotation = Quaternion.LookRotation(target.position + new Vector3(0f, 0.8f, 3.2f) - go.transform.position, Vector3.up);
        }

        public static EnemyController CreateEnemy(Transform target, string resource, Vector3 position, float health, float speed, float height)
        {
            var root = new GameObject(resource[(resource.LastIndexOf('/') + 1)..], typeof(Health), typeof(EnemyController));
            root.transform.position = position;
            var enemy = root.GetComponent<EnemyController>();
            var archetype = resource.Contains("shieldguard") ? EnemyArchetype.Shieldguard
                : resource.Contains("hound") ? EnemyArchetype.Hound
                : resource.Contains("juggernaut") ? EnemyArchetype.Brute
                : EnemyArchetype.Raider;
            enemy.Configure(target, health, speed, archetype);
            var visual = CreateActorVisual(root.transform, resource, height, Color.white);
            if (visual != null && archetype == EnemyArchetype.Raider)
            {
                var animator = visual.gameObject.AddComponent<EnemySpriteAnimator>();
                animator.Configure(root.transform, height,
                    "Art/Monsters/bloodbound-advance-v3",
                    "Art/Monsters/bloodbound-advance-v3",
                    "Art/Monsters/bloodbound-cleave-v3",
                    "Art/Monsters/bloodbound-hit-v3",
                    "Art/Monsters/bloodbound-defeated-v3");
            }
            else if (visual != null && archetype == EnemyArchetype.Shieldguard)
            {
                var animator = visual.gameObject.AddComponent<EnemySpriteAnimator>();
                animator.Configure(root.transform, height,
                    "Art/Monsters/coldbone-advance-v3",
                    "Art/Monsters/coldbone-advance-v3",
                    "Art/Monsters/coldbone-strike-v3",
                    "Art/Monsters/coldbone-hit-v3",
                    "Art/Monsters/coldbone-defeated-v3");
            }
            return enemy;
        }

        public static BossController CreateBoss(Transform target, Vector3 position)
        {
            var root = new GameObject("The Ashen Castellan", typeof(Health), typeof(BossController));
            root.transform.position = position;
            var boss = root.GetComponent<BossController>();
            boss.Configure(target, 1800f);
            var visual = CreateActorVisual(root.transform, "Art/Bosses/castellan-phase-1-v2", 5.8f, Color.white);
            visual.gameObject.AddComponent<BossSpriteAnimator>().Configure(5.8f);
            return boss;
        }

        public static WardAnchor CreateWardAnchor(Vector3 position, System.Action<WardAnchor> destroyed)
        {
            var root = new GameObject("Blue Ash Ward Anchor", typeof(Health), typeof(WardAnchor));
            root.transform.position = position;
            for (var i = 0; i < 3; i++)
            {
                var shard = GameObject.CreatePrimitive(PrimitiveType.Cube);
                shard.name = "Ward Crystal";
                shard.transform.SetParent(root.transform, false);
                shard.transform.localPosition = new Vector3((i - 1) * 0.38f, 0.72f + i * 0.2f, 0f);
                shard.transform.localScale = new Vector3(0.28f, 1.35f - i * 0.16f, 0.28f);
                shard.transform.localRotation = Quaternion.Euler(12f * (i - 1), 45f + i * 24f, 8f * (1 - i));
                var color = i == 1 ? new Color(0.18f, 0.72f, 1f) : new Color(0.5f, 0.22f, 1f);
                shard.GetComponent<Renderer>().material = Material(color, 0.45f, 0.28f, color * 5f);
                Destroy(shard.GetComponent<Collider>());
            }
            var ring = CreateGroundRing(position, 1.35f, new Color(0.2f, 0.72f, 1f, 0.84f));
            root.GetComponent<WardAnchor>().Configure(260f, ring, destroyed);
            return root.GetComponent<WardAnchor>();
        }

        private static SpriteRenderer CreateActorVisual(Transform root, string resource, float height, Color tint)
        {
            var shadow = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            shadow.name = "Contact Shadow";
            shadow.transform.SetParent(root, false);
            shadow.transform.localPosition = new Vector3(0f, 0.025f, 0f);
            shadow.transform.localScale = new Vector3(height * 0.32f, 0.012f, height * 0.18f);
            shadow.GetComponent<Renderer>().material = Material(new Color(0.005f, 0.004f, 0.004f), 0f, 1f);
            Destroy(shadow.GetComponent<Collider>());

            var texture = Resources.Load<Texture2D>(resource);
            if (texture == null) return null;
            var sprite = Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(0.5f, 0.06f), texture.height / height);
            var visual = new GameObject("Visual", typeof(SpriteRenderer), typeof(BillboardActor));
            visual.transform.SetParent(root, false);
            visual.transform.localPosition = Vector3.up * 0.02f;
            var renderer = visual.GetComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.color = tint;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            renderer.receiveShadows = true;
            return renderer;
        }

        public static GameObject CreateGroundRing(Vector3 position, float radius, Color color)
        {
            var ring = new GameObject("Attack Telegraph", typeof(LineRenderer));
            ring.name = "Attack Telegraph";
            ring.transform.position = position + Vector3.up * 0.035f;
            var line = ring.GetComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.loop = true;
            line.positionCount = 64;
            line.startWidth = line.endWidth = Mathf.Clamp(radius * 0.055f, 0.045f, 0.14f);
            var template = Resources.Load<Material>("Materials/RuntimeUnlit");
            line.material = template != null ? new Material(template) : Material(color, 0.05f, 0.8f, color * 1.8f);
            line.material.color = color;
            line.startColor = line.endColor = color;
            for (var i = 0; i < line.positionCount; i++)
            {
                var angle = i * Mathf.PI * 2f / line.positionCount;
                line.SetPosition(i, new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius));
            }
            return ring;
        }

        public static GameObject CreateGroundSector(Vector3 position, Vector3 direction, float radius, float halfAngle, Color color)
        {
            var sector = new GameObject("Directional Telegraph", typeof(LineRenderer));
            sector.transform.position = position + Vector3.up * 0.04f;
            var line = sector.GetComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.loop = true;
            line.positionCount = 20;
            line.startWidth = line.endWidth = 0.075f;
            line.material = Resources.Load<Material>("Materials/RuntimeUnlit");
            line.startColor = line.endColor = color;
            line.SetPosition(0, Vector3.zero);
            var heading = Mathf.Atan2(direction.x, direction.z) * Mathf.Rad2Deg;
            for (var i = 0; i < 18; i++)
            {
                var angle = heading - halfAngle + halfAngle * 2f * (i / 17f);
                var radians = angle * Mathf.Deg2Rad;
                line.SetPosition(i + 1, new Vector3(Mathf.Sin(radians) * radius, 0f, Mathf.Cos(radians) * radius));
            }
            line.SetPosition(19, Vector3.zero);
            return sector;
        }

        public static void SpawnImpact(Vector3 position, bool critical)
        {
            var impact = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            impact.name = critical ? "Critical Impact" : "Impact";
            impact.transform.position = position;
            impact.transform.localScale = Vector3.one * (critical ? 0.62f : 0.34f);
            var color = critical ? new Color(1f, 0.72f, 0.2f) : new Color(0.4f, 0.82f, 1f);
            impact.GetComponent<Renderer>().material = Material(color, 0.08f, 0.22f, color * 3.5f);
            Destroy(impact.GetComponent<Collider>());
            Destroy(impact, 0.12f);
        }

        public static void SpawnArcProjectile(Vector3 position, ICombatTarget target, float damage, bool critical)
        {
            var projectile = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            projectile.name = critical ? "Critical Arc Bolt" : "Arc Bolt";
            projectile.transform.position = position;
            projectile.transform.localScale = Vector3.one * (critical ? 0.22f : 0.16f);
            var color = critical ? new Color(1f, 0.64f, 0.16f) : new Color(0.24f, 0.78f, 1f);
            projectile.GetComponent<Renderer>().material = Material(color, 0.12f, 0.08f, color * 6f);
            Destroy(projectile.GetComponent<Collider>());
            projectile.AddComponent<ArcProjectile>().Configure(target, position, damage, critical);
        }

        public static void SpawnShockwave(Vector3 position, Color color)
        {
            var pulse = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pulse.name = "Elemental Shockwave";
            pulse.transform.position = position + Vector3.up * 0.055f;
            pulse.transform.localScale = new Vector3(0.12f, 0.014f, 0.12f);
            pulse.GetComponent<Renderer>().material = Material(color, 0f, 0.18f, color * 4f);
            Destroy(pulse.GetComponent<Collider>());
            pulse.AddComponent<TransientPulse>().Configure(new Vector3(3.2f, 0.014f, 3.2f), 0.24f);
        }

        public static void SpawnAfterimage(Vector3 position, Color color)
        {
            var echo = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            echo.name = "Teleport Echo";
            echo.transform.position = position + Vector3.up * 0.9f;
            echo.transform.localScale = new Vector3(0.42f, 0.9f, 0.42f);
            echo.GetComponent<Renderer>().material = Material(color, 0f, 0.1f, color * 5f);
            Destroy(echo.GetComponent<Collider>());
            echo.AddComponent<TransientPulse>().Configure(new Vector3(0.08f, 1.7f, 0.08f), 0.22f);
        }

        public static void SpawnDamageNumber(Vector3 position, float damage, bool critical)
        {
            var label = new GameObject("Damage Number", typeof(FloatingCombatText));
            label.transform.position = position + Vector3.up * 1.35f + Vector3.right * Random.Range(-0.15f, 0.15f);
            label.GetComponent<FloatingCombatText>().Configure(damage, critical);
        }

        public static void SpawnLootBeam(Vector3 position)
        {
            var beam = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            beam.name = "Rare Loot Beam";
            beam.transform.position = position + Vector3.up * 1.8f;
            beam.transform.localScale = new Vector3(0.09f, 1.8f, 0.09f);
            var color = new Color(0.18f, 0.75f, 1f);
            beam.GetComponent<Renderer>().material = Material(color, 0f, 0.18f, color * 5f);
            Destroy(beam.GetComponent<Collider>());
            Destroy(beam, 5f);
        }

        public static LootPickup SpawnLootPickup(Vector3 position, PlayerController player, bool legendary, System.Action collected = null)
        {
            var relic = GameObject.CreatePrimitive(legendary ? PrimitiveType.Cube : PrimitiveType.Sphere);
            relic.name = legendary ? "Castellan Relic" : "Ward Shard";
            relic.transform.position = position + Vector3.up * 0.38f;
            relic.transform.localScale = Vector3.one * (legendary ? 0.42f : 0.24f);
            relic.transform.rotation = Quaternion.Euler(35f, 45f, 15f);
            var color = legendary ? new Color(1f, 0.54f, 0.08f) : new Color(0.16f, 0.72f, 1f);
            relic.GetComponent<Renderer>().material = Material(color, 0.72f, 0.18f, color * 5f);
            Destroy(relic.GetComponent<Collider>());
            var pickup = relic.AddComponent<LootPickup>();
            pickup.Configure(player, legendary ? 0.22f : 0.03f, legendary ? 300f : 25f, collected);
            return pickup;
        }

        private static Material Material(Color color, float metallic, float smoothness, Color emission = default, Texture texture = null)
        {
            var template = Resources.Load<Material>("Materials/RuntimeBase");
            var material = template != null ? new Material(template) : new Material(Shader.Find("Standard"));
            material.color = color;
            material.SetFloat("_Metallic", metallic);
            material.SetFloat("_Glossiness", smoothness);
            if (texture != null) material.mainTexture = texture;
            if (emission.maxColorComponent > 0f)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", emission);
            }
            return material;
        }
    }
}
