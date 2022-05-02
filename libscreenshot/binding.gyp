{
    "targets": [
        {
            "target_name": "libscreenshot",
            "sources": [
                "libscreenshot.cc"
            ],
            "cflags_cc": ["-O3"],
            "conditions": [
                ['OS == "linux"', {"libraries": ["-lX11"]}],
                ['OS == "mac"', {"libraries": ["-framework CoreGraphics"]}]
            ],
            "include_dirs" : [
                "<!(node -e \"require('nan')\")"
            ]
        }
    ]
}
