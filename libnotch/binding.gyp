{
    "targets": [
        {
            "target_name": "libnotch",
            "cflags_cc": ["-O3"],
            "conditions": [
                ['OS == "linux"', {"sources": ["libnotch.other.cc"]}],
                ['OS == "mac"', {"sources": ["libnotch.darwin.mm"], "cxxflags": ["-ObjC++"], "libraries": ["-lobjc", "-framework Cocoa"]}]
            ],
            "include_dirs" : [
                "<!(node -e \"require('nan')\")"
            ]
        }
    ]
}
