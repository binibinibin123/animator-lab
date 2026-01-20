const LF_I2V_BATCH_V1_1 = {
    // ... (Keep existing content logic, just internal variable now) 

    "10": {
        "inputs": {
            "sage_attention": "sageattn_qk_int8_pv_fp16_triton",
            "allow_compile": false,
            "model": [
                "67",
                0
            ]
        },
        "class_type": "PathchSageAttentionKJ",
        "_meta": {
            "title": "🚨Sage Attention High"
        }
    },
    "11": {
        "inputs": {
            "sage_attention": "sageattn_qk_int8_pv_fp16_triton",
            "allow_compile": false,
            "model": [
                "70",
                0
            ]
        },
        "class_type": "PathchSageAttentionKJ",
        "_meta": {
            "title": "🚨Sage Attention Low"
        }
    },
    "27": {
        "inputs": {
            "model": [
                "11",
                0
            ]
        },
        "class_type": "ModelPassThrough",
        "_meta": {
            "title": "ModelPass"
        }
    },
    "28": {
        "inputs": {
            "model": [
                "10",
                0
            ]
        },
        "class_type": "ModelPassThrough",
        "_meta": {
            "title": "ModelPass"
        }
    },
    "32": {
        "inputs": {
            "shift": [
                "517",
                0
            ],
            "model": [
                "584",
                0
            ]
        },
        "class_type": "ModelSamplingSD3",
        "_meta": {
            "title": "Shift - Low"
        }
    },
    "33": {
        "inputs": {
            "shift": [
                "516",
                0
            ],
            "model": [
                "585",
                0
            ]
        },
        "class_type": "ModelSamplingSD3",
        "_meta": {
            "title": "Shift - High"
        }
    },
    "55": {
        "inputs": {
            "image": "image.png",
            "upload": "image"
        },
        "class_type": "LoadImage",
        "_meta": {
            "title": "🖼️Input Image"
        }
    },
    "56": {
        "inputs": {
            "upscale_method": "lanczos",
            "megapixels": 0.5,
            "resolution_steps": 1,
            "image": [
                "822",
                0
            ]
        },
        "class_type": "ImageScaleToTotalPixels",
        "_meta": {
            "title": "📏Manual Scale Image to MegaPixels"
        }
    },
    "67": {
        "inputs": {
            "PowerLoraLoaderHeaderWidget": {
                "type": "PowerLoraLoaderHeaderWidget"
            },
            "➕ Add Lora": "",
            "model": [
                "1:1336",
                0
            ]
        },
        "class_type": "Power Lora Loader (rgthree)",
        "_meta": {
            "title": "✨Lora Stack - High"
        }
    },
    "70": {
        "inputs": {
            "PowerLoraLoaderHeaderWidget": {
                "type": "PowerLoraLoaderHeaderWidget"
            },
            "➕ Add Lora": "",
            "model": [
                "1:1337",
                0
            ]
        },
        "class_type": "Power Lora Loader (rgthree)",
        "_meta": {
            "title": "✨Lora Stack - Low"
        }
    },
    "88": {
        "inputs": {
            "value": "overexposed,  subtitles, style, artwork, painting, picture, overall gray, worst quality, low quality, JPEG compression residue, incomplete, extra fingers, poorly drawn hands, deformed, disfigured, malformed limbs, fused fingers, three legs, missing fingers,four fingers,bad hands, \n\ntalking, bad anatomy, downsampling, aliasing, jpeg artifacts, compression artifacts, poorly drawn, low-resolution, bad, distortion, slow motion, slow movements, slow mo, bullet time, small movements,watermark, text, "
        },
        "class_type": "PrimitiveStringMultiline",
        "_meta": {
            "title": "🍎Negative Prompt"
        }
    },
    "89": {
        "inputs": {
            "value": ""
        },
        "class_type": "PrimitiveStringMultiline",
        "_meta": {
            "title": "🍏Positive Prompt"
        }
    },
    "90": {
        "inputs": {
            "text": [
                "89",
                0
            ],
            "clip": [
                "1:38",
                0
            ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
            "title": "🍏Positive Prompt"
        }
    },
    "91": {
        "inputs": {
            "text": [
                "88",
                0
            ],
            "clip": [
                "1:38",
                0
            ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
            "title": "🍎Negative Prompt"
        }
    },
    "135": {
        "inputs": {
            "seed": 0
        },
        "class_type": "Seed (rgthree)",
        "_meta": {
            "title": "🎲Seed"
        }
    },
    "139": {
        "inputs": {
            "Xi": 1,
            "Xf": 1,
            "isfloatX": 1
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "🏵️High CFG"
        }
    },
    "140": {
        "inputs": {
            "Xi": 1,
            "Xf": 1,
            "isfloatX": 1
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "🏵️Low CFG"
        }
    },
    "150": {
        "inputs": {
            "Xi": 5,
            "Xf": 5,
            "isfloatX": 1
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "⌚Duration (Seconds)"
        }
    },
    "151": {
        "inputs": {
            "Xi": 2,
            "Xf": 2,
            "isfloatX": 0
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "👞Split Steps at"
        }
    },
    "152": {
        "inputs": {
            "Xi": 4,
            "Xf": 4,
            "isfloatX": 0
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "🚶‍➡️Total Steps"
        }
    },
    "153": {
        "inputs": {
            "Xi": 8,
            "Xf": 8,
            "isfloatX": 1
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "🌊Shift - High"
        }
    },
    "159": {
        "inputs": {
            "samples": [
                "615:617",
                0
            ],
            "vae": [
                "1:39",
                0
            ]
        },
        "class_type": "VAEDecode",
        "_meta": {
            "title": "🧬VAE Decode"
        }
    },
    "162": {
        "inputs": {
            "frame_rate": [
                "394",
                0
            ],
            "loop_count": 0,
            "filename_prefix": [
                "225",
                0
            ],
            "format": "video/h264-mp4",
            "pix_fmt": "yuv420p",
            "crf": 12,
            "save_metadata": true,
            "trim_to_audio": false,
            "pingpong": false,
            "save_output": true,
            "images": [
                "448",
                0
            ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
            "title": "🎥🎞️📐🔸"
        }
    },
    "168": {
        "inputs": {
            "Xi": 8,
            "Xf": 8,
            "isfloatX": 1
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "🌊Shift - Low"
        }
    },
    "181": {
        "inputs": {
            "any_01": [
                "182",
                0
            ]
        },
        "class_type": "Any Switch (rgthree)",
        "_meta": {
            "title": "Final View Switch"
        }
    },
    "182": {
        "inputs": {
            "value": 0
        },
        "class_type": "INTConstant",
        "_meta": {
            "title": "🎥Preview"
        }
    },
    "206": {
        "inputs": {
            "boolean": [
                "526",
                0
            ],
            "on_true": [
                "678",
                0
            ],
            "on_false": [
                "245",
                0
            ]
        },
        "class_type": "easy ifElse",
        "_meta": {
            "title": "If else"
        }
    },
    "208": {
        "inputs": {
            "Xi": 3,
            "Xf": 3,
            "isfloatX": 0
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "🎞️InterpolMultiplier🔸"
        }
    },
    "217": {
        "inputs": {
            "value": [
                "39:590",
                0
            ]
        },
        "class_type": "easy string",
        "_meta": {
            "title": "Prev"
        }
    },
    "218": {
        "inputs": {
            "value": [
                "39:588",
                0
            ]
        },
        "class_type": "easy string",
        "_meta": {
            "title": "Intp"
        }
    },
    "221": {
        "inputs": {
            "value": [
                "39:591",
                0
            ]
        },
        "class_type": "easy string",
        "_meta": {
            "title": "Ups"
        }
    },
    "222": {
        "inputs": {
            "value": [
                "39:589",
                0
            ]
        },
        "class_type": "easy string",
        "_meta": {
            "title": "intpUps"
        }
    },
    "225": {
        "inputs": {
            "index": [
                "181",
                0
            ],
            "value0": [
                "217",
                0
            ],
            "value1": [
                "218",
                0
            ],
            "value2": [
                "221",
                0
            ],
            "value3": [
                "222",
                0
            ]
        },
        "class_type": "easy anythingIndexSwitch",
        "_meta": {
            "title": "FilePath Output Index"
        }
    },
    "230": {
        "inputs": {
            "output": "",
            "source": [
                "826",
                0
            ]
        },
        "class_type": "Display Any (rgthree)",
        "_meta": {
            "title": "🗂️ Filename(s)"
        }
    },
    "237": {
        "inputs": {
            "image": [
                "448",
                0
            ]
        },
        "class_type": "GetImageSize+",
        "_meta": {
            "title": "Get Image Size"
        }
    },
    "245": {
        "inputs": {
            "boolean": [
                "661",
                0
            ],
            "on_true": [
                "689:689",
                0
            ],
            "on_false": [
                "619",
                0
            ]
        },
        "class_type": "easy ifElse",
        "_meta": {
            "title": "If else"
        }
    },
    "265": {
        "inputs": {
            "index": [
                "181",
                0
            ],
            "value0": [
                "522",
                0
            ],
            "value1": [
                "523",
                0
            ],
            "value2": [
                "522",
                0
            ],
            "value3": [
                "523",
                0
            ]
        },
        "class_type": "easy anythingIndexSwitch",
        "_meta": {
            "title": "Fps Output Index"
        }
    },
    "284": {
        "inputs": {
            "Xi": 1,
            "Xf": 1,
            "isfloatX": 1
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "☄️Speed (1)🔸"
        }
    },
    "286": {
        "inputs": {
            "output": "",
            "source": [
                "660",
                0
            ]
        },
        "class_type": "Display Any (rgthree)",
        "_meta": {
            "title": "📏Dimension Used (Update After Gen)"
        }
    },
    "318": {
        "inputs": {
            "Xi": 0,
            "Xf": 0,
            "isfloatX": 0
        },
        "class_type": "mxSlider",
        "_meta": {
            "title": "✂️Skip Initial Frames🔸"
        }
    },
    "319": {
        "inputs": {
            "output": "",
            "source": [
                "659",
                0
            ]
        },
        "class_type": "Display Any (rgthree)",
        "_meta": {
            "title": "📏Final Dimension🎬Frames⌚Duration📹FPS🎞️Total Frames"
        }
    },
    "350": {
        "inputs": {
            "image": [
                "159",
                0
            ]
        },
        "class_type": "GetImageSize+",
        "_meta": {
            "title": "Get Image Size"
        }
    },
    "394": {
        "inputs": {
            "any_02": [
                "521",
                0
            ]
        },
        "class_type": "Any Switch (rgthree)",
        "_meta": {
            "title": "fps Switch"
        }
    },
    "448": {
        "inputs": {
            "any_02": [
                "206",
                0
            ]
        },
        "class_type": "Any Switch (rgthree)",
        "_meta": {
            "title": "Bypass Switch"
        }
    },
    "514": {
        "inputs": {
            "output_type": "float",
            "*": [
                "139",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "515": {
        "inputs": {
            "output_type": "float",
            "*": [
                "140",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "516": {
        "inputs": {
            "output_type": "float",
            "*": [
                "153",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "517": {
        "inputs": {
            "output_type": "float",
            "*": [
                "168",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "518": {
        "inputs": {
            "output_type": "float",
            "*": [
                "284",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "520": {
        "inputs": {
            "outputs": {
                "outputs": [
                    "INT"
                ]
            },
            "code": "(a*16)+1",
            "a": [
                "527",
                0
            ]
        },
        "class_type": "Power Puter (rgthree)",
        "_meta": {
            "title": "Math"
        }
    },
    "521": {
        "inputs": {
            "output_type": "float",
            "*": [
                "265",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "522": {
        "inputs": {
            "outputs": {
                "outputs": [
                    "INT"
                ]
            },
            "code": "floor(16*a)",
            "a": [
                "518",
                0
            ]
        },
        "class_type": "Power Puter (rgthree)",
        "_meta": {
            "title": "Math"
        }
    },
    "523": {
        "inputs": {
            "outputs": {
                "outputs": [
                    "INT"
                ]
            },
            "code": "a*b",
            "a": [
                "208",
                0
            ],
            "b": [
                "522",
                0
            ]
        },
        "class_type": "Power Puter (rgthree)",
        "_meta": {
            "title": "Math"
        }
    },
    "526": {
        "inputs": {
            "outputs": {
                "outputs": [
                    "BOOLEAN"
                ]
            },
            "code": "indexOpt = round(((a/2-floor(a/2))),2);\n\nif (indexOpt > 0):\n    return True\nelse:\n    return False",
            "a": [
                "181",
                0
            ]
        },
        "class_type": "Power Puter (rgthree)",
        "_meta": {
            "title": "Code"
        }
    },
    "527": {
        "inputs": {
            "output_type": "float",
            "*": [
                "150",
                0
            ]
        },
        "class_type": "easy convertAnything",
        "_meta": {
            "title": "Convert Any"
        }
    },
    "540": {
        "inputs": {
            "anything": [
                "245",
                0
            ]
        },
        "class_type": "easy cleanGpuUsed",
        "_meta": {
            "title": "Clean VRAM Used"
        }
    },
    "580": {
        "inputs": {
            "anything": [
                "159",
                0
            ]
        },
        "class_type": "easy cleanGpuUsed",
        "_meta": {
            "title": "Clean VRAM Used"
        }
    },
    "584": {
        "inputs": {
            "nag_scale": 11,
            "nag_strength": 1,
            "shift": [
                "517",
                0
            ],
            "model": [
                "28",
                0
            ]
        },
        "class_type": "ModelSamplingSD3Neg",
        "_meta": {
            "title": "ModelSamplingSD3Neg"
        }
    },
    "585": {
        "inputs": {
            "nag_scale": 11,
            "nag_strength": 1,
            "shift": [
                "516",
                0
            ],
            "model": [
                "27",
                0
            ]
        },
        "class_type": "ModelSamplingSD3Neg",
        "_meta": {
            "title": "ModelSamplingSD3Neg"
        }
    },
    "615:617": {
        "inputs": {
            "input": [
                "615:612",
                0
            ]
        },
        "class_type": "ImpactLogger",
        "_meta": {
            "title": "ImpactLogger"
        }
    },
    "615:612": {
        "inputs": {
            "noise": [
                "615:70",
                0
            ],
            "guider": [
                "615:582",
                0
            ],
            "sampler": [
                "615:600",
                0
            ],
            "sigmas": [
                "615:611",
                0
            ],
            "latent_image": [
                "615:604",
                0
            ]
        },
        "class_type": "SamplerCustomAdvanced",
        "_meta": {
            "title": "SamplerCustomAdvanced"
        }
    },
    "615:582": {
        "inputs": {
            "model": [
                "32",
                0
            ],
            "conditioning": [
                "615:655",
                0
            ]
        },
        "class_type": "BasicGuider",
        "_meta": {
            "title": "BasicGuider"
        }
    },
    "615:600": {
        "inputs": {
            "sampler_name": "euler_ancestral"
        },
        "class_type": "KSamplerSelect",
        "_meta": {
            "title": "KSamplerSelect"
        }
    },
    "615:611": {
        "inputs": {
            "scheduler": "sgm_uniform",
            "steps": [
                "520",
                0
            ],
            "denoise": 1,
            "model": [
                "32",
                0
            ]
        },
        "class_type": "BasicScheduler",
        "_meta": {
            "title": "BasicScheduler"
        }
    },
    "615:604": {
        "inputs": {
            "width": [
                "822",
                0
            ],
            "height": [
                "822",
                1
            ],
            "length": [
                "520",
                0
            ],
            "batch_size": 1
        },
        "class_type": "EmptyHunyuanLatentVideo",
        "_meta": {
            "title": "EmptyHunyuanLatentVideo"
        }
    },
    "615:655": {
        "inputs": {
            "strength": 0.45,
            "start_percent": 0.05,
            "end_percent": 1,
            "positive": [
                "90",
                0
            ],
            "negative": [
                "91",
                0
            ],
            "control_net": [
                "1:621",
                0
            ],
            "image": [
                "56",
                0
            ]
        },
        "class_type": "ControlNetApplyAdvanced",
        "_meta": {
            "title": "ControlNetApplyAdvanced"
        }
    },
    "615:70": {
        "inputs": {
            "seed": [
                "135",
                0
            ]
        },
        "class_type": "RandomNoise",
        "_meta": {
            "title": "RandomNoise"
        }
    },
    "619": {
        "inputs": {
            "samples": [
                "668:617",
                0
            ],
            "vae": [
                "1:39",
                0
            ]
        },
        "class_type": "VAEDecode",
        "_meta": {
            "title": "🧬VAE Decode"
        }
    },
    "659": {
        "inputs": {
            "output": "",
            "source": [
                "245",
                0
            ]
        },
        "class_type": "Display Any (rgthree)",
        "_meta": {
            "title": "📏Final Dimension🎬Frames⌚Duration📹FPS🎞️Total Frames"
        }
    },
    "660": {
        "inputs": {
            "output": "",
            "source": [
                "652",
                0
            ]
        },
        "class_type": "Display Any (rgthree)",
        "_meta": {
            "title": "📏Dimension Used (Update After Gen)"
        }
    },
    "661": {
        "inputs": {
            "outputs": {
                "outputs": [
                    "BOOLEAN"
                ]
            },
            "code": "if a == 0:\n    return True\nelse:\n    return False",
            "a": [
                "181",
                0
            ]
        },
        "class_type": "Power Puter (rgthree)",
        "_meta": {
            "title": "Code"
        }
    },
    "668:612": {
        "inputs": {
            "noise": [
                "668:70",
                0
            ],
            "guider": [
                "668:582",
                0
            ],
            "sampler": [
                "668:600",
                0
            ],
            "sigmas": [
                "668:611",
                0
            ],
            "latent_image": [
                "668:604",
                0
            ]
        },
        "class_type": "SamplerCustomAdvanced",
        "_meta": {
            "title": "SamplerCustomAdvanced"
        }
    },
    "668:617": {
        "inputs": {
            "input": [
                "668:612",
                0
            ]
        },
        "class_type": "ImpactLogger",
        "_meta": {
            "title": "ImpactLogger"
        }
    },
    "668:70": {
        "inputs": {
            "seed": [
                "135",
                0
            ]
        },
        "class_type": "RandomNoise",
        "_meta": {
            "title": "RandomNoise"
        }
    },
    "668:582": {
        "inputs": {
            "model": [
                "33",
                0
            ],
            "conditioning": [
                "668:655",
                0
            ]
        },
        "class_type": "BasicGuider",
        "_meta": {
            "title": "BasicGuider"
        }
    },
    "668:600": {
        "inputs": {
            "sampler_name": "euler_ancestral"
        },
        "class_type": "KSamplerSelect",
        "_meta": {
            "title": "KSamplerSelect"
        }
    },
    "668:611": {
        "inputs": {
            "scheduler": "sgm_uniform",
            "steps": [
                "520",
                0
            ],
            "denoise": 1,
            "model": [
                "33",
                0
            ]
        },
        "class_type": "BasicScheduler",
        "_meta": {
            "title": "BasicScheduler"
        }
    },
    "668:604": {
        "inputs": {
            "width": [
                "822",
                0
            ],
            "height": [
                "822",
                1
            ],
            "length": [
                "520",
                0
            ],
            "batch_size": 1
        },
        "class_type": "EmptyHunyuanLatentVideo",
        "_meta": {
            "title": "EmptyHunyuanLatentVideo"
        }
    },
    "668:655": {
        "inputs": {
            "strength": 0.55,
            "start_percent": 0.05,
            "end_percent": 1,
            "positive": [
                "90",
                0
            ],
            "negative": [
                "91",
                0
            ],
            "control_net": [
                "1:621",
                0
            ],
            "image": [
                "56",
                0
            ]
        },
        "class_type": "ControlNetApplyAdvanced",
        "_meta": {
            "title": "ControlNetApplyAdvanced"
        }
    },
    "678": {
        "inputs": {
            "filenmae": [
                "225",
                0
            ],
            "fps": [
                "521",
                0
            ],
            "loop_count": 0,
            "format": "video/h264-mp4",
            "create_gif": false,
            "images": [
                "619",
                0
            ],
            "pingPong": false,
            "save_image": true,
            "crf": 20,
            "videopreview": {
                "hidden": false,
                "format": "VIDEO",
                "title": "Video Save"
            }
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
            "title": "Video Combine 🎥"
        }
    },
    "689": {
        "inputs": {
            "images": [
                "689:680",
                0
            ]
        },
        "class_type": "RIFEOpticalFlowV3",
        "_meta": {
            "title": "RIFEOpticalFlowV3"
        }
    },
    "689:689": {
        "inputs": {
            "filenmae": [
                "225",
                0
            ],
            "fps": [
                "521",
                0
            ],
            "loop_count": 0,
            "format": "video/h264-mp4",
            "create_gif": false,
            "images": [
                "689",
                0
            ],
            "pingPong": false,
            "save_image": true,
            "crf": 20,
            "videopreview": {
                "hidden": false,
                "format": "VIDEO",
                "title": "Video Save"
            }
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
            "title": "Video Combine 🎥"
        }
    },
    "689:680": {
        "inputs": {
            "clear_cache_after_n_frames": 20,
            "multiplier": [
                "208",
                0
            ],
            "fast_mode": true,
            "ensemble": true,
            "scale_factor": 1,
            "frames": [
                "619",
                0
            ],
            "optical_flow": [
                "689:688",
                0
            ]
        },
        "class_type": "RIFE VFI",
        "_meta": {
            "title": "RIFE VFI"
        }
    },
    "689:688": {
        "inputs": {
            "model_name": "rife47.pth"
        },
        "class_type": "Load RIFE Model",
        "_meta": {
            "title": "Load RIFE Model"
        }
    },
    "822": {
        "inputs": {
            "image": [
                "55",
                0
            ]
        },
        "class_type": "GetImageSize+",
        "_meta": {
            "title": "Get Image Size"
        }
    },
    "826": {
        "inputs": {
            "outputs": {
                "outputs": [
                    "STRING"
                ]
            },
            "code": "if a == 0:\n    return 'Prev'\nif a == 1:\n    return 'Intp'\nif a == 2:\n    return 'Ups'\nif a == 3:\n    return 'IntpUps'",
            "a": [
                "181",
                0
            ]
        },
        "class_type": "Power Puter (rgthree)",
        "_meta": {
            "title": "Code"
        }
    },
    "1:38": {
        "inputs": {
            "clip_name": "t5/google_t5-v1_1-xxl_encoderonly_fp8_e4m3fn.safetensors",
            "type": "hunyuan_video",
            "device": "default"
        },
        "class_type": "CLIPLoader",
        "_meta": {
            "title": "🕹️Load CLIP"
        }
    },
    "1:39": {
        "inputs": {
            "vae_name": "hunyuan_video_vae_bf16.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": {
            "title": "🍪Load VAE"
        }
    },
    "1:621": {
        "inputs": {
            "control_net_name": "hunyuan_video_720_cfg_distill_fp16.safetensors"
        },
        "class_type": "ControlNetLoader",
        "_meta": {
            "title": "ControlNetLoader"
        }
    },
    "1:1336": {
        "inputs": {
            "lora_name": "flux_realism_lora.safetensors",
            "strength_model": 1,
            "strength_clip": 1
        },
        "class_type": "LoraLoader",
        "_meta": {
            "title": "LoraLoader"
        }
    },
    "1:1337": {
        "inputs": {
            "lora_name": "flux_realism_lora.safetensors",
            "strength_model": 1,
            "strength_clip": 1
        },
        "class_type": "LoraLoader",
        "_meta": {
            "title": "LoraLoader"
        }
    }
};

const RAPID_AIO_MEGA = {
    "8": {
        "inputs": {
            "seed": 6456545463455,
            "steps": 4,
            "cfg": 1,
            "sampler_name": "ipndm",
            "scheduler": "beta",
            "denoise": 1,
            "model": [
                "32",
                0
            ],
            "positive": [
                "28",
                0
            ],
            "negative": [
                "28",
                1
            ],
            "latent_image": [
                "28",
                2
            ]
        },
        "class_type": "KSampler",
        "_meta": {
            "title": "KSampler"
        }
    },
    "9": {
        "inputs": {
            "text": "",
            "clip": [
                "52",
                0
            ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
            "title": "CLIP 텍스트 인코딩 (프롬프트)"
        }
    },
    "10": {
        "inputs": {
            "text": "",
            "clip": [
                "52",
                0
            ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
            "title": "Negative Prompt (leave blank cuz 1 CFG)"
        }
    },
    "11": {
        "inputs": {
            "samples": [
                "8",
                0
            ],
            "vae": [
                "53",
                0
            ]
        },
        "class_type": "VAEDecode",
        "_meta": {
            "title": "VAE 디코드"
        }
    },
    "16": {
        "inputs": {
            "image": "pasted/image (1).png"
        },
        "class_type": "LoadImage",
        "_meta": {
            "title": "Start Frame (Optional)"
        }
    },
    "28": {
        "inputs": {
            "width": 832,
            "height": 480,
            "length": [
                "48",
                0
            ],
            "batch_size": 1,
            "strength": 1,
            "positive": [
                "9",
                0
            ],
            "negative": [
                "10",
                0
            ],
            "vae": [
                "53",
                0
            ],
            "control_video": [
                "34",
                0
            ],
            "control_masks": [
                "34",
                1
            ]
        },
        "class_type": "WanVaceToVideo",
        "_meta": {
            "title": "T2V=Strength 0, I2V=Strength 1"
        }
    },
    "32": {
        "inputs": {
            "shift": 8,
            "model": [
                "51",
                0
            ]
        },
        "class_type": "ModelSamplingSD3",
        "_meta": {
            "title": "모델 샘플링 (SD3)"
        }
    },
    "34": {
        "inputs": {
            "num_frames": [
                "48",
                0
            ],
            "empty_frame_level": 0.5,
            "start_index": 0,
            "end_index": -1,
            "start_image": [
                "16",
                0
            ]
        },
        "class_type": "WanVideoVACEStartToEndFrame",
        "_meta": {
            "title": "Bypass for T2V, use for I2V"
        }
    },
    "39": {
        "inputs": {
            "frame_rate": 16,
            "loop_count": 0,
            "filename_prefix": "rapid-mega-out/vid",
            "format": "video/h264-mp4",
            "pix_fmt": "yuv420p",
            "crf": 12,
            "save_metadata": true,
            "trim_to_audio": false,
            "pingpong": false,
            "save_output": true,
            "images": [
                "11",
                0
            ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
            "title": "Video Combine 🎥🅥🅗🅢"
        }
    },
    "48": {
        "inputs": {
            "value": 81
        },
        "class_type": "PrimitiveInt",
        "_meta": {
            "title": "Number of Frames"
        }
    },
    "51": {
        "inputs": {
            "unet_name": "wan2.2-rapid-mega-aio-nsfw-v12.1-Q3_K.gguf"
        },
        "class_type": "UnetLoaderGGUF",
        "_meta": {
            "title": "Unet Loader (GGUF)"
        }
    },
    "52": {
        "inputs": {
            "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
            "type": "wan",
            "device": "default"
        },
        "class_type": "CLIPLoader",
        "_meta": {
            "title": "CLIP 로드"
        }
    },
    "53": {
        "inputs": {
            "vae_name": "wan_2.1_vae.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": {
            "title": "VAE 로드"
        }
    }
};

const RAPID_AIO_MEGA_SAGE = {
    "8": {
        "inputs": {
            "seed": 886296311537594,
            "steps": 4,
            "cfg": 1,
            "sampler_name": "ipndm",
            "scheduler": "beta",
            "denoise": 1,
            "model": ["32", 0],
            "positive": ["28", 0],
            "negative": ["28", 1],
            "latent_image": ["28", 2]
        },
        "class_type": "KSampler",
        "_meta": { "title": "KSampler" }
    },
    "9": {
        "inputs": { "text": "", "clip": ["52", 0] },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "CLIP 텍스트 인코딩 (프롬프트)" }
    },
    "10": {
        "inputs": { "text": "", "clip": ["52", 0] },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "Negative Prompt (leave blank cuz 1 CFG)" }
    },
    "11": {
        "inputs": { "samples": ["8", 0], "vae": ["53", 0] },
        "class_type": "VAEDecode",
        "_meta": { "title": "VAE 디코드" }
    },
    "16": {
        "inputs": { "image": "pasted/image (1).png" },
        "class_type": "LoadImage",
        "_meta": { "title": "Start Frame (Optional)" }
    },
    "28": {
        "inputs": {
            "width": 832, "height": 480,
            "length": ["48", 0], "batch_size": 1, "strength": 1,
            "positive": ["9", 0], "negative": ["10", 0],
            "vae": ["53", 0], "control_video": ["34", 0], "control_masks": ["34", 1]
        },
        "class_type": "WanVaceToVideo",
        "_meta": { "title": "T2V=Strength 0, I2V=Strength 1" }
    },
    "32": {
        "inputs": { "shift": 8, "model": ["54", 0] },
        "class_type": "ModelSamplingSD3",
        "_meta": { "title": "모델 샘플링 (SD3)" }
    },
    "34": {
        "inputs": {
            "num_frames": ["48", 0], "empty_frame_level": 0.5,
            "start_index": 0, "end_index": -1, "start_image": ["16", 0]
        },
        "class_type": "WanVideoVACEStartToEndFrame",
        "_meta": { "title": "Bypass for T2V, use for I2V" }
    },
    "39": {
        "inputs": {
            "frame_rate": 16, "loop_count": 0,
            "filename_prefix": "rapid-mega-out/vid",
            "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 12,
            "save_metadata": true, "trim_to_audio": false,
            "pingpong": false, "save_output": true,
            "images": ["11", 0]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": { "title": "Video Combine 🎥🅥🅗🅢" }
    },
    "48": {
        "inputs": { "value": 81 },
        "class_type": "PrimitiveInt",
        "_meta": { "title": "Number of Frames" }
    },
    "51": {
        "inputs": { "unet_name": "wan2.2-rapid-mega-aio-nsfw-v12.1-Q3_K.gguf" },
        "class_type": "UnetLoaderGGUF",
        "_meta": { "title": "Unet Loader (GGUF)" }
    },
    "52": {
        "inputs": { "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan", "device": "default" },
        "class_type": "CLIPLoader",
        "_meta": { "title": "CLIP 로드" }
    },
    "53": {
        "inputs": { "vae_name": "wan_2.1_vae.safetensors" },
        "class_type": "VAELoader",
        "_meta": { "title": "VAE 로드" }
    },
    "54": {
        "inputs": { "sage_attention": "sageattn_qk_int8_pv_fp16_triton", "allow_compile": false, "model": ["51", 0] },
        "class_type": "PathchSageAttentionKJ",
        "_meta": { "title": "Patch Sage Attention KJ" }
    }
};

// Rapid AIO Mega + Sage v2 (from Rapid-AIO-Mega_api_sage_2.json)
// Uses different CLIP model: t5xxl_um_fp8_e4m3fn_scaled.safetensors
const RAPID_AIO_MEGA_SAGE_2 = {
    "8": {
        "inputs": {
            "seed": 739578501617166,
            "steps": 4,
            "cfg": 1,
            "sampler_name": "ipndm",
            "scheduler": "beta",
            "denoise": 1,
            "model": ["32", 0],
            "positive": ["28", 0],
            "negative": ["28", 1],
            "latent_image": ["28", 2]
        },
        "class_type": "KSampler",
        "_meta": { "title": "KSampler" }
    },
    "9": {
        "inputs": { "text": "", "clip": ["52", 0] },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "CLIP 텍스트 인코딩 (프롬프트)" }
    },
    "10": {
        "inputs": { "text": "", "clip": ["52", 0] },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "Negative Prompt (leave blank cuz 1 CFG)" }
    },
    "11": {
        "inputs": { "samples": ["8", 0], "vae": ["53", 0] },
        "class_type": "VAEDecode",
        "_meta": { "title": "VAE 디코드" }
    },
    "16": {
        "inputs": { "image": "pasted/image (1).png" },
        "class_type": "LoadImage",
        "_meta": { "title": "Start Frame (Optional)" }
    },
    "28": {
        "inputs": {
            "width": 832, "height": 480,
            "length": ["48", 0], "batch_size": 1, "strength": 1,
            "positive": ["9", 0], "negative": ["10", 0],
            "vae": ["53", 0], "control_video": ["34", 0], "control_masks": ["34", 1]
        },
        "class_type": "WanVaceToVideo",
        "_meta": { "title": "T2V=Strength 0, I2V=Strength 1" }
    },
    "32": {
        "inputs": { "shift": 8, "model": ["54", 0] },
        "class_type": "ModelSamplingSD3",
        "_meta": { "title": "모델 샘플링 (SD3)" }
    },
    "34": {
        "inputs": {
            "num_frames": ["48", 0], "empty_frame_level": 0.5,
            "start_index": 0, "end_index": -1, "start_image": ["16", 0]
        },
        "class_type": "WanVideoVACEStartToEndFrame",
        "_meta": { "title": "Bypass for T2V, use for I2V" }
    },
    "39": {
        "inputs": {
            "frame_rate": 16, "loop_count": 0,
            "filename_prefix": "rapid-mega-out/vid",
            "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 12,
            "save_metadata": true, "trim_to_audio": false,
            "pingpong": false, "save_output": true,
            "images": ["11", 0]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": { "title": "Video Combine 🎥🅥🅗🅢" }
    },
    "48": {
        "inputs": { "value": 81 },
        "class_type": "PrimitiveInt",
        "_meta": { "title": "Number of Frames" }
    },
    "51": {
        "inputs": { "unet_name": "wan2.2-rapid-mega-aio-nsfw-v12.1-Q3_K.gguf" },
        "class_type": "UnetLoaderGGUF",
        "_meta": { "title": "Unet Loader (GGUF)" }
    },
    "52": {
        "inputs": { "clip_name": "t5xxl_um_fp8_e4m3fn_scaled.safetensors", "type": "wan", "device": "default" },
        "class_type": "CLIPLoader",
        "_meta": { "title": "CLIP 로드" }
    },
    "53": {
        "inputs": { "vae_name": "wan_2.1_vae.safetensors" },
        "class_type": "VAELoader",
        "_meta": { "title": "VAE 로드" }
    },
    "54": {
        "inputs": { "sage_attention": "sageattn_qk_int8_pv_fp16_triton", "allow_compile": false, "model": ["51", 0] },
        "class_type": "PathchSageAttentionKJ",
        "_meta": { "title": "Patch Sage Attention KJ" }
    }
};

export const WORKFLOWS = {
    'lf-i2v-v1.1': {
        name: 'LF i2v (Batch) v1.1',
        description: 'Realism Optimized (Sage Attention + Lora)',
        workflow: LF_I2V_BATCH_V1_1
    },
    'ltx-video-default': {
        name: 'LTX Video (Fast)',
        description: 'Standard LTX-Video workflow (Faster generation)',
        workflow: {
            "1": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": "image.png",
                    "upload": "image"
                }
            },
            "2": {
                "class_type": "LTXVLoader",
                "inputs": {
                    "ckpt_name": "ltxv_13b_fp8_e4m3fn.safetensors"
                }
            },
            "3": {
                "class_type": "LTXVConditioning",
                "inputs": {
                    "positive": "camera movement",
                    "negative": "blurry, distorted, low quality, text, watermark",
                    "ltxv": ["2", 0]
                }
            },
            "4": {
                "class_type": "LTXVSampler",
                "inputs": {
                    "seed": 0,
                    "steps": 30,
                    "cfg": 7.0,
                    "image": ["1", 0],
                    "ltxv": ["2", 0],
                    "conditioning": ["3", 0],
                    "num_frames": 49,
                    "frame_rate": 24
                }
            },
            "5": {
                "class_type": "VHS_VideoCombine",
                "inputs": {
                    "images": ["4", 0],
                    "frame_rate": 24,
                    "loop_count": 0,
                    "filename_prefix": "autovideo_output",
                    "format": "video/mp4",
                    "pingpong": false,
                    "save_output": true
                }
            }
        }
    },
    'rapid-aio-mega': {
        name: 'Rapid AIO Mega',
        description: 'WanVace To Video (High Quality)',
        workflow: RAPID_AIO_MEGA
    },
    'rapid-aio-mega-sage': {
        name: 'Rapid AIO Mega + Sage',
        description: 'WanVace + Sage Attention (Faster)',
        workflow: RAPID_AIO_MEGA_SAGE
    },
    'rapid-aio-mega-sage-2': {
        name: 'Rapid AIO Mega + Sage v2',
        description: 'WanVace + Sage Attention v2 (Optimized CLIP)',
        workflow: RAPID_AIO_MEGA_SAGE_2
    }
} as const;

export type WorkflowId = keyof typeof WORKFLOWS;

