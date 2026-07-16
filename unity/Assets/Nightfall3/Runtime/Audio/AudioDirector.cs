using Nightfall3.Flow;
using UnityEngine;

namespace Nightfall3.Audio
{
    public sealed class AudioDirector : MonoBehaviour
    {
        private AudioSource campMusic;
        private DemoFlowController flow;
        private AudioClip death;
        private AudioClip hit;
        private AudioClip pickup;
        private AudioClip select;
        private AudioClip skill;
        private AudioSource sfx;
        private AudioSource worldMusic;

        public static AudioDirector Instance { get; private set; }

        public void Configure(DemoFlowController demoFlow)
        {
            Instance = this;
            flow = demoFlow;
            campMusic = CreateMusicSource("Emberwatch Music", "Audio/Music/emberwatch-cathedral");
            worldMusic = CreateMusicSource("Ashen Approach Music", "Audio/Music/ashen-approach-atmosphere");
            sfx = gameObject.AddComponent<AudioSource>();
            sfx.playOnAwake = false;
            sfx.spatialBlend = 0f;
            hit = Resources.Load<AudioClip>("Audio/SFX/hit");
            skill = Resources.Load<AudioClip>("Audio/SFX/skill");
            pickup = Resources.Load<AudioClip>("Audio/SFX/pickup");
            death = Resources.Load<AudioClip>("Audio/SFX/death");
            select = Resources.Load<AudioClip>("Audio/SFX/select");
            campMusic.volume = 0.32f;
            worldMusic.volume = 0f;
            campMusic.Play();
            worldMusic.Play();
        }

        private void Update()
        {
            if (flow == null || campMusic == null || worldMusic == null) return;
            var inCamp = flow.PhaseId == "Briefing";
            campMusic.volume = Mathf.MoveTowards(campMusic.volume, inCamp ? 0.32f : 0f, Time.unscaledDeltaTime * 0.18f);
            worldMusic.volume = Mathf.MoveTowards(worldMusic.volume, inCamp ? 0f : 0.38f, Time.unscaledDeltaTime * 0.18f);
        }

        private AudioSource CreateMusicSource(string name, string resource)
        {
            var source = gameObject.AddComponent<AudioSource>();
            source.name = name;
            source.clip = Resources.Load<AudioClip>(resource);
            source.loop = true;
            source.playOnAwake = false;
            source.spatialBlend = 0f;
            source.priority = 32;
            return source;
        }

        private void Play(AudioClip clip, float volume, float pitch)
        {
            if (clip == null || sfx == null) return;
            sfx.pitch = pitch;
            sfx.PlayOneShot(clip, volume);
        }

        public static void PlayHit(bool critical) => Instance?.Play(Instance.hit, critical ? 0.92f : 0.62f, critical ? 0.82f : Random.Range(0.94f, 1.08f));
        public static void PlaySkill(float pitch = 1f) => Instance?.Play(Instance.skill, 0.72f, pitch);
        public static void PlayPickup(bool legendary) => Instance?.Play(Instance.pickup, legendary ? 1f : 0.72f, legendary ? 0.72f : 1.12f);
        public static void PlayDeath(bool boss = false) => Instance?.Play(Instance.death, boss ? 1f : 0.7f, boss ? 0.64f : 1f);
        public static void PlaySelect() => Instance?.Play(Instance.select, 0.58f, 1f);

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }
    }
}
