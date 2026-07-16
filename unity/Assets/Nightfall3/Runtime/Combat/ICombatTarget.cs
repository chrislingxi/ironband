using UnityEngine;

namespace Nightfall3.Combat
{
    public interface ICombatTarget
    {
        Transform TargetTransform { get; }
        bool IsDead { get; }
        void ReceiveHit(float damage, Vector3 origin, bool critical);
    }
}
