using UnityEngine;

namespace Nightfall3.Presentation
{
    public sealed class BillboardActor : MonoBehaviour
    {
        private Camera targetCamera;

        private void LateUpdate()
        {
            if (targetCamera == null) targetCamera = Camera.main;
            if (targetCamera == null) return;
            transform.rotation = Quaternion.LookRotation(targetCamera.transform.forward, Vector3.up);
        }
    }
}
