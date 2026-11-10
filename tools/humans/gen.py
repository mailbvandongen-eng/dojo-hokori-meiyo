# Genereert een realistische vechter met MPFB (MakeHuman voor Blender, CC0-assets) en exporteert hem
# als glTF (.gltf + .bin; textures gedeeld in assets/humans/tex/).
# Gebruik: blender -b --factory-startup --python gen.py -- spec.json uit.gltf  (zie build.mjs)
import bpy, sys, json, importlib, os

bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
def dyn(p, k):
    for m in list(sys.modules):
        if m.endswith(p): return getattr(importlib.import_module(m), k)
    raise ValueError(p)
HumanService = dyn("mpfb.services.humanservice", "HumanService")
AssetService = dyn("mpfb.services.assetservice", "AssetService")
ExportService = dyn("mpfb.services.exportservice", "ExportService")
ObjectService = dyn("mpfb.services.objectservice", "ObjectService")
TargetService = dyn("mpfb.services.targetservice", "TargetService")

argv = sys.argv[sys.argv.index("--") + 1:]
spec = json.load(open(argv[0])); out = argv[1]

# leeg beginnen
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

male = spec["geslacht"] == "m"
race = spec.get("race", "caucasian")
macro = TargetService.get_default_macro_info_dict()
macro.update({
    "gender": 1.0 if male else 0.0,
    "age": spec.get("age", 0.5),
    "muscle": spec.get("muscle", 0.65),
    "weight": spec.get("weight", 0.5),
    "height": spec.get("height", 0.5),
    "proportions": spec.get("proportions", 0.65),
    "cupsize": spec.get("cupsize", 0.45),
    "firmness": 0.6,
    "race": ({"asian": 0.34, "caucasian": 0.33, "african": 0.33} if spec.get("raceBlend") else
             {"asian": 1.0 if race == "asian" else 0.0, "caucasian": 1.0 if race == "caucasian" else 0.0, "african": 1.0 if race == "african" else 0.0}),
})
basemesh = HumanService.create_human(macro_detail_dict=macro)

def asset(name, subdir):
    p = AssetService.find_asset_absolute_path(name, asset_subdir=subdir)
    if p is None: raise RuntimeError(f"niet gevonden: {subdir}/{name}")
    return p

skin = spec.get("skin") or f"young_{race}_{'male' if male else 'female'}.mhmat"
HumanService.set_character_skin(asset(skin, "skins"), basemesh, skin_type="GAMEENGINE")
HumanService.add_builtin_rig(basemesh, "mixamo")
ASSETS = spec.get("assets") or [["eyes", "low-poly.mhclo", "Eyes"], ["eyebrows", spec.get("eyebrows", "eyebrow001.mhclo"), "Eyebrows"],
                          ["eyelashes", "eyelashes01.mhclo", "Eyelashes"],
                          ["hair", spec.get("hair", "short02.mhclo"), "Hair"]]
for sub, fname, atype in ASSETS:
    if fname: HumanService.add_mhclo_asset(asset(fname, sub), basemesh, asset_type=atype, material_type="GAMEENGINE")

# kopie voor export, modifiers bakken, hulpgeometrie weg
MODE = spec.get("mode", "bake")
if MODE == "bake":
    root = ExportService.create_character_copy(basemesh, name_suffix="_x")
    xbase = ObjectService.find_object_of_type_amongst_nearest_relatives(root, "Basemesh")
    ExportService.bake_modifiers_remove_helpers(xbase, bake_masks=True, bake_subdiv=True, remove_helpers=True, also_proxy=True)
else:
    root = ObjectService.find_object_of_type_amongst_nearest_relatives(basemesh, "Skeleton") or basemesh.parent
    xbase = basemesh
# vormsleutels (MakeHuman-macro's) vastleggen: de game heeft ze niet nodig en ze zijn 2 MB per vechter
for o in [root] + ObjectService.get_list_of_children(root):
    if o.type == "MESH" and o.data.shape_keys:
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
if spec.get("gi", True):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import gi as GI
    GI.build_gi(basemesh, xbase, root, spec)

objs = [root] + ObjectService.get_list_of_children(root)
report = {"objects": []}
for o in objs:
    if o.type == "MESH":
        report["objects"].append({"name": o.name, "type": ObjectService.get_object_type(o) if hasattr(ObjectService, "get_object_type") else "", "verts": len(o.data.vertices), "polys": len(o.data.polygons)})
print("RAPPORT", json.dumps(report))
bpy.ops.object.select_all(action="DESELECT")
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = root
# textures verkleinen (1024 px is genoeg op gevechtsafstand) en delen tussen vechters
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, int(1024 * img.size[1] / img.size[0]))
bpy.ops.export_scene.gltf(filepath=out, export_format="GLTF_SEPARATE", export_texture_dir="tex", use_selection=True, export_skins=True,
                          export_animations=False, export_apply=(MODE != "bake"), export_image_format="WEBP", export_image_quality=82, export_yup=True)
print("GEEXPORTEERD", out, os.path.getsize(out), os.path.getsize(out.replace(".gltf", ".bin")))
