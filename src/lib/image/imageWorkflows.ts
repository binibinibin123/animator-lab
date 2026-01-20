// Qwen 2511 Image Edit Workflow for ComfyUI
// Based on: docs/qwen 2511 api.json

export const QWEN_2511_WORKFLOW = {
    "1": {
        "inputs": {
            "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
            "type": "qwen_image",
            "device": "default"
        },
        "class_type": "CLIPLoader",
        "_meta": { "title": "Load CLIP" }
    },
    "2": {
        "inputs": {
            "shift": 3.1,
            "model": ["11", 0]
        },
        "class_type": "ModelSamplingAuraFlow",
        "_meta": { "title": "ModelSamplingAuraFlow" }
    },
    "3": {
        "inputs": {
            "vae_name": "qwen_image_vae.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": { "title": "Load VAE" }
    },
    "5": {
        "inputs": {
            "reference_latents_method": "index_timestep_zero",
            "conditioning": ["9", 0]
        },
        "class_type": "FluxKontextMultiReferenceLatentMethod",
        "_meta": { "title": "Edit Model Reference Method" }
    },
    "6": {
        "inputs": {
            "reference_latents_method": "index_timestep_zero",
            "conditioning": ["13", 0]
        },
        "class_type": "FluxKontextMultiReferenceLatentMethod",
        "_meta": { "title": "Edit Model Reference Method" }
    },
    "7": {
        "inputs": {
            "strength": 1,
            "model": ["2", 0]
        },
        "class_type": "CFGNorm",
        "_meta": { "title": "CFGNorm" }
    },
    "9": {
        "inputs": {
            "prompt": "",
            "clip": ["1", 0],
            "vae": ["3", 0],
            "image1": ["16", 0]
        },
        "class_type": "TextEncodeQwenImageEditPlus",
        "_meta": { "title": "TextEncodeQwenImageEditPlus (Negative)" }
    },
    "11": {
        "inputs": {
            "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
            "strength_model": 1,
            "model": ["18", 0]
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": { "title": "LoraLoaderModelOnly" }
    },
    "12": {
        "inputs": {
            "samples": ["15", 0],
            "vae": ["3", 0]
        },
        "class_type": "VAEDecode",
        "_meta": { "title": "VAE Decode" }
    },
    "13": {
        "inputs": {
            "prompt": "",
            "clip": ["1", 0],
            "vae": ["3", 0],
            "image1": ["16", 0]
        },
        "class_type": "TextEncodeQwenImageEditPlus",
        "_meta": { "title": "TextEncodeQwenImageEditPlus (Positive)" }
    },
    "14": {
        "inputs": {
            "pixels": ["16", 0],
            "vae": ["3", 0]
        },
        "class_type": "VAEEncode",
        "_meta": { "title": "VAE Encode" }
    },
    "15": {
        "inputs": {
            "seed": 0,
            "steps": 4,
            "cfg": 1,
            "sampler_name": "euler",
            "scheduler": "simple",
            "denoise": 1,
            "model": ["7", 0],
            "positive": ["6", 0],
            "negative": ["5", 0],
            "latent_image": ["14", 0]
        },
        "class_type": "KSampler",
        "_meta": { "title": "KSampler" }
    },
    "16": {
        "inputs": {
            "image": ["19", 0]
        },
        "class_type": "FluxKontextImageScale",
        "_meta": { "title": "FluxKontextImageScale" }
    },
    "17": {
        "inputs": {
            "filename_prefix": "autovideo_img",
            "images": ["12", 0]
        },
        "class_type": "SaveImage",
        "_meta": { "title": "Save Image" }
    },
    "18": {
        "inputs": {
            "gguf_name": "qwen-image-edit-2511-Q3_K_L.gguf"
        },
        "class_type": "LoaderGGUF",
        "_meta": { "title": "GGUF Loader" }
    },
    "19": {
        "inputs": {
            "image": "placeholder.png"
        },
        "class_type": "LoadImage",
        "_meta": { "title": "Load Image" }
    }
};

export const IMAGE_WORKFLOWS = {
    'qwen-2511': {
        name: 'Qwen 2511 Image Edit',
        description: 'Local Qwen Image Edit (4 steps, Lightning)',
        workflow: QWEN_2511_WORKFLOW
    }
} as const;

export type ImageWorkflowId = keyof typeof IMAGE_WORKFLOWS;
