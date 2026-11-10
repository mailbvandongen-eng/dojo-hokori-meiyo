# Bouwt een Kyokushin-dogi op een MPFB-mens, uit de hulpvormen van het MakeHuman-basismodel:
#  helper-tights → jas (romp + mouwen tot net onder de elleboog) en broek (wijd tot boven de enkel)
#  helper-skirt  → jasrok (tot halverwege de dij)
# plus revers/kraag, band met knoop en uiteinden, en een vlak voor de kanji 極真 op de linkerborst.
# De botgewichten van de hulpvormen blijven behouden, dus alles beweegt mee met het skelet.
# Blender: -Y = voorkant, +X = linkerkant van de vechter, Z = omhoog.
import bpy, bmesh, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def _bone(arm, name):
    b = arm.data.bones.get("mixamorig:" + name)
    return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local


def _extract(base, group, name, arm):
    """Kopieert de vertices van een hulpgroep naar een eigen object (met vertex groups)."""
    ob = base.copy(); ob.data = base.data.copy(); ob.name = name
    bpy.context.collection.objects.link(ob)
    for m in list(ob.modifiers):
        if m.type != 'ARMATURE': ob.modifiers.remove(m)
        else: m.object = arm
    if ob.data.shape_keys:  # de vormen (lengte, bouw, geslacht) vastleggen
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    gi = ob.vertex_groups[group].index
    bm = bmesh.new(); bm.from_mesh(ob.data)
    dl = bm.verts.layers.deform.active
    kill = [v for v in bm.verts if v[dl].get(gi, 0.0) < 0.5]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(ob.data); bm.free()
    return ob


def _keep(ob, pred):
    """Houdt alleen vlakken waarvan alle hoekpunten aan pred(co) voldoen."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    kill = [f for f in bm.faces if not all(pred(ob.matrix_world @ v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(ob.data); bm.free()


def _inflate(ob, amount):
    """Duwt elk hoekpunt naar buiten langs de normaal met amount(co) meter."""
    me = ob.data
    me.update()
    bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
    for v in bm.verts:
        w = ob.matrix_world @ v.co
        v.co += v.normal * amount(w)
    bm.to_mesh(me); bm.free()


def _smooth_subdiv(ob, smooth=0.5, iters=4, levels=1):
    m = ob.modifiers.new("smooth", 'SMOOTH'); m.factor = smooth; m.iterations = iters
    s = ob.modifiers.new("subd", 'SUBSURF'); s.levels = levels; s.render_levels = levels
    # modifiers vóór de armature zetten en toepassen (gewichten worden mee-geïnterpoleerd)
    with bpy.context.temp_override(object=ob, active_object=ob):
        for name in ("smooth", "subd"):
            while ob.modifiers[0].name != name: bpy.ops.object.modifier_move_up(modifier=name)
            bpy.ops.object.modifier_apply(modifier=name)


def _mat(name, color):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf: bsdf.inputs["Base Color"].default_value = (*color, 1); bsdf.inputs["Roughness"].default_value = 0.9
    return m


def _assign(ob, mat):
    ob.data.materials.clear(); ob.data.materials.append(mat)


def _weights_from(target, source):
    """Neemt botgewichten over van source (dichtstbijzijnde vlak)."""
    for g in source.vertex_groups:
        if g.name.startswith("mixamorig") and g.name not in target.vertex_groups: target.vertex_groups.new(name=g.name)
    dt = target.modifiers.new("dt", 'DATA_TRANSFER')
    dt.object = source; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    with bpy.context.temp_override(object=target, active_object=target):
        while target.modifiers[0].name != "dt": bpy.ops.object.modifier_move_up(modifier="dt")
        bpy.ops.object.modifier_apply(modifier="dt")
    if not any(m.type == 'ARMATURE' for m in target.modifiers):
        am = target.modifiers.new("Armature", 'ARMATURE'); am.object = source.find_armature()


def build_gi(base, body, arm, spec):
    """base: basismesh met hulpvormen; body: het geëxporteerde lichaam (wordt bijgesneden).
    spec["outfit"] == "official": scheidsrechter (wit shirt met lange mouwen, donkere broek, geen band)."""
    female = spec["geslacht"] == "v"
    official = spec.get("outfit") == "official"
    belt_rgb = tuple(spec.get("belt_rgb", (0.95, 0.95, 0.93)))
    hips, _ = _bone(arm, "Hips")
    l_el, l_wr = _bone(arm, "LeftForeArm")
    l_knee, l_ank = _bone(arm, "LeftLeg")
    l_sh, _ = _bone(arm, "LeftArm")
    neck, _ = _bone(arm, "Neck")
    waist_z = hips.z + 0.035
    crotch_z = hips.z - 0.09
    sleeve_len = (l_wr - l_el).length * (0.9 if official else 0.28)  # mouw tot net onder de elleboog (official: pols)
    pant_end_z = l_ank.z + 0.085                    # broek tot boven de enkel
    skirt_end_z = crotch_z - 0.17                   # jasrok tot halverwege de dij

    def along_forearm(p):  # afstand voorbij de elleboog, langs de onderarm (links of rechts)
        side = 1 if p.x >= 0 else -1
        e = Vector((l_el.x * side, l_el.y, l_el.z)); w = Vector((l_wr.x * side, l_wr.y, l_wr.z))
        d = (w - e).normalized()
        return (p - e).dot(d)

    def is_arm(p): return abs(p.x) > abs(l_sh.x) - 0.02 and p.z > crotch_z

    # ── jas: romp + mouwen ──
    jacket = _extract(base, "helper-tights", "gi_jacket", arm)
    _keep(jacket, lambda p: (p.z > waist_z - 0.05) and (not is_arm(p) or along_forearm(p) < sleeve_len))
    v_bottom = neck.z - (0.23 if not female else 0.2)
    def jacket_ease(p):
        if is_arm(p):
            t = max(0.0, min(1.0, along_forearm(p) / max(0.01, sleeve_len) * 0.5 + 0.5))
            return (0.012 + 0.006 * t) if official else (0.022 + 0.03 * t)  # mouwen wijder naar de opening
        # een gi valt recht: extra ruimte in de taille (vooral bij vrouwen)
        waist = max(0.0, 1 - abs(p.z - (waist_z + 0.1)) / 0.14)
        return 0.016 + (0.008 if p.z < waist_z + 0.12 else 0.0) + waist * (0.028 if female else 0.012)
    _inflate(jacket, jacket_ease)
    _smooth_subdiv(jacket, smooth=0.6, iters=6)
    # V-hals: twee rechte sneden vanaf het borstbeen schuin omhoog, voorkant ertussen open
    VS = 0.55 if not official else 0.18
    if official: v_bottom = neck.z - 0.07   # alleen een kleine opening (overhemdkraag)
    bm = bmesh.new(); bm.from_mesh(jacket.data)
    for side in (1, -1):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector((0, 0, v_bottom)), plane_no=Vector((1, 0, -side * VS)).normalized())
    mw = jacket.matrix_world
    def in_v(f):
        c = mw @ f.calc_center_median()
        return c.y < -0.02 and c.z > v_bottom and abs(c.x) < (c.z - v_bottom) * VS
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if in_v(f)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(jacket.data); bm.free()

    # ── wit T-shirt onder de jas (vrouwen, zoals gebruikelijk in Kyokushin) ──
    tee = None
    if female:
        tee = _extract(base, "helper-tights", "gi_tee", arm)
        # ronde hals: voor ~6 cm onder de nek, achter ~2 cm
        _keep(tee, lambda p: p.z > waist_z - 0.02 and (not is_arm(p) or abs(p.x) < abs(l_sh.x) + 0.05)
              and p.z < neck.z - (0.065 if p.y < -0.03 else 0.02) - 0.03 * min(1.0, abs(p.x) / 0.08) * (1 if p.y < -0.03 else 0))
        _inflate(tee, lambda p: 0.006)
        _smooth_subdiv(tee, smooth=0.6, iters=6)

    # ── jasrok (official: overhemd valt in de broek; geen rok) ──
    skirt = _extract(base, "helper-skirt", "gi_skirt", arm)
    if official: skirt_end_z = waist_z - 0.04
    _keep(skirt, lambda p: skirt_end_z < p.z < waist_z + 0.02)
    _inflate(skirt, lambda p: 0.02 + 0.03 * max(0.0, (waist_z - p.z) / (waist_z - skirt_end_z)))
    _smooth_subdiv(skirt, smooth=0.5, iters=4)

    # ── broek ──
    pants = _extract(base, "helper-tights", "gi_pants", arm)
    _keep(pants, lambda p: pant_end_z < p.z < waist_z + 0.01 and not is_arm(p))
    if official: _inflate(pants, lambda p: 0.014 + 0.012 * max(0.0, min(1.0, (l_knee.z - p.z) / (l_knee.z - pant_end_z))))
    else: _inflate(pants, lambda p: 0.022 + 0.05 * max(0.0, min(1.0, (l_knee.z + 0.1 - p.z) / (l_knee.z + 0.1 - pant_end_z))))
    _smooth_subdiv(pants, smooth=0.6, iters=6)

    # ── revers en kraag: band langs de rand van de V-hals en de nekopening ──
    lapel = jacket.copy(); lapel.data = jacket.data.copy(); lapel.name = "gi_lapel"; bpy.context.collection.objects.link(lapel)
    lapel.data.materials.clear()
    bm = bmesh.new(); bm.from_mesh(lapel.data)
    edge_verts = {v for e in bm.edges if e.is_boundary for v in e.verts if (lapel.matrix_world @ v.co).z > v_bottom - 0.02}
    band = set(edge_verts)
    for _ in range(4):  # vier ringen breed
        band |= {o for v in list(band) for e in v.link_edges for o in e.verts}
    # schuine rand van de bovenpand: van het borstbeen naar de linkerheup
    a2 = Vector((0.0, v_bottom)); b2 = Vector((0.13, waist_z))
    def near_edge(v):
        p = lapel.matrix_world @ v.co
        if p.y > -0.02 or not (waist_z - 0.01 < p.z < v_bottom + 0.005): return False
        q = Vector((p.x, p.z)); ab = b2 - a2; t_ = max(0, min(1, (q - a2).dot(ab) / ab.length_squared))
        return (q - (a2 + ab * t_)).length < 0.016
    if not official: band |= {v for v in bm.verts if near_edge(v)}
    kill = [f for f in bm.faces if not all(v in band for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.006
    bm.to_mesh(lapel.data); bm.free()

    # ── band (obi) ──
    bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.05, major_segments=48, minor_segments=8, location=(0, hips.y, waist_z))
    obi = bpy.context.active_object; obi.name = "gi_obi"
    # straal en vorm van de jas op tailleniveau
    jm = jacket.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    ring = [jacket.matrix_world @ v.co for v in jm.vertices if abs((jacket.matrix_world @ v.co).z - waist_z) < 0.03]
    rx = max(abs(p.x) for p in ring) + 0.012; ry = (max(p.y for p in ring) - min(p.y for p in ring)) / 2 + 0.012
    cy = (max(p.y for p in ring) + min(p.y for p in ring)) / 2
    jacket.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
    obi.scale = (rx, ry, 0.42); obi.location.y = cy
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # knoop en twee hangende uiteinden, voor op de buik
    front_y = cy - ry - 0.006
    parts = [obi]
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=16, ring_count=10, location=(0.012, front_y - 0.01, waist_z)); knot = bpy.context.active_object
    knot.scale = (0.045, 0.022, 0.03); parts.append(knot)
    for dx, ang in ((0.03, 0.14), (-0.016, -0.08)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(dx, front_y - 0.012, waist_z - 0.115)); end = bpy.context.active_object
        end.scale = (0.04, 0.007, 0.22); end.rotation_euler = (0.06, 0, ang); parts.append(end)
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obi
    for o in parts[1:]: o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.join()
    obi = bpy.context.active_object; obi.name = "gi_obi"

    # ── kanji-vlak op de linkerborst (+X) ──
    kz = neck.z - 0.17
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.085, -0.3, kz), rotation=(math.pi / 2, 0, 0))
    kanji = bpy.context.active_object; kanji.name = "gi_kanji"
    kanji.scale = (0.07, 0.13, 1); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=6); bpy.ops.object.mode_set(mode='OBJECT')
    sw = kanji.modifiers.new("sw", 'SHRINKWRAP'); sw.target = jacket; sw.wrap_method = 'PROJECT'; sw.use_project_y = True; sw.use_negative_direction = True; sw.use_positive_direction = True; sw.offset = 0.004
    with bpy.context.temp_override(object=kanji, active_object=kanji): bpy.ops.object.modifier_apply(modifier="sw")

    # gewichten voor de toegevoegde delen
    for o in (obi, kanji): _weights_from(o, jacket if o is kanji else skirt)
    for o in (obi, kanji): o.parent = arm

    # materialen (de game zet er het echte stofmateriaal op, op basis van de naam)
    gi_m = _mat("gi", (0.92, 0.91, 0.88))
    for o in (jacket, skirt, pants): _assign(o, gi_m)
    if official: _assign(pants, _mat("pants_dark", (0.06, 0.07, 0.1)))
    _assign(lapel, _mat("gi_lapel", (0.86, 0.85, 0.82)))
    if tee: _assign(tee, _mat("tee", (1, 1, 1))); tee.parent = arm
    _assign(obi, _mat("obi", belt_rgb)); _assign(kanji, _mat("gi_kanji", (1, 1, 1)))
    for o in (jacket, skirt, pants, lapel): o.parent = arm

    # ── lichaam bijsnijden: wat onder de stof valt, gaat weg (prikt anders door bij bewegen) ──
    dg = bpy.context.evaluated_depsgraph_get()
    garments = []
    for o in (jacket, skirt, pants) + ((tee,) if tee else ()):
        bm2 = bmesh.new(); bm2.from_mesh(o.data); bm2.transform(o.matrix_world); garments.append(BVHTree.FromBMesh(bm2)); bm2.free()
    bm = bmesh.new(); bm.from_mesh(body.data)
    mw = body.matrix_world
    def covered(v):
        p = mw @ v.co
        if not female and p.y < -0.02 and p.z > v_bottom - 0.02 and abs(p.x) < (p.z - v_bottom) * 0.55 + 0.05: return False  # borst in de V
        for t in garments:
            hit = t.find_nearest(p)
            if hit[0] is not None and hit[3] < 0.07 and (p - hit[0]).dot(hit[1]) < 0.002: return True
        return False
    kill = [f for f in bm.faces if all(covered(v) for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(body.data); bm.free()
    if official:  # geen band en geen kanji
        for o in (obi, kanji): bpy.data.objects.remove(o, do_unlink=True)
        obi = kanji = None
    return [o for o in (jacket, skirt, pants, lapel, obi, kanji, tee) if o]
