var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// admin/db/connect.js
var require_connect = __commonJS({
  "admin/db/connect.js"(exports, module) {
    "use strict";
    var { Pool } = __require("pg");
    var pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      // max connections in pool (keep low for Neon free tier)
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    });
    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });
    pool.connect((err, client, release) => {
      if (err) {
        console.error("[DB] \u274C Failed to connect to Neon PostgreSQL:", err.message);
        return;
      }
      console.log("[DB] \u2705 Connected to Neon PostgreSQL successfully");
      release();
    });
    module.exports = pool;
  }
});

// admin/middleware/auth.js
var require_auth = __commonJS({
  "admin/middleware/auth.js"(exports, module) {
    "use strict";
    function requireAdminAuth(req, res, next) {
      if (req.session && req.session.adminUser) {
        return next();
      }
      req.session.returnTo = req.originalUrl;
      return res.redirect("/admin/login");
    }
    module.exports = { requireAdminAuth };
  }
});

// admin/routes/adminRouter.js
var require_adminRouter = __commonJS({
  "admin/routes/adminRouter.js"(exports, module) {
    "use strict";
    var express = __require("express");
    var bcrypt = __require("bcryptjs");
    var pool = require_connect();
    var { requireAdminAuth } = require_auth();
    var router = express.Router();
    function sanitize(v) {
      if (typeof v !== "string") return "";
      return v.replace(/<[^>]*>/g, "").trim().slice(0, 500);
    }
    function toBool(val) {
      return val === "on" || val === "true" || val === true || val === "1" || val === 1;
    }
    router.get("/login", (req, res) => {
      if (req.session && req.session.adminUser) return res.redirect("/admin");
      res.render("login", { error: null, nonce: res.locals.nonce });
    });
    router.post("/login", async (req, res) => {
      const username = sanitize(req.body.username || "");
      const password = sanitize(req.body.password || "");
      if (!username || !password) {
        return res.render("login", {
          error: "Username and password are required.",
          nonce: res.locals.nonce
        });
      }
      try {
        const result = await pool.query(
          "SELECT id, username, password_hash FROM admin_users WHERE username = $1",
          [username]
        );
        const user = result.rows[0];
        if (!user) {
          return res.render("login", { error: "Invalid credentials.", nonce: res.locals.nonce });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return res.render("login", { error: "Invalid credentials.", nonce: res.locals.nonce });
        }
        req.session.adminUser = { id: user.id, username: user.username };
        const returnTo = req.session.returnTo || "/admin";
        delete req.session.returnTo;
        return res.redirect(returnTo);
      } catch (err) {
        console.error("[ADMIN LOGIN] DB error:", err.message);
        return res.render("login", { error: "Server error. Please try again.", nonce: res.locals.nonce });
      }
    });
    router.get("/logout", (req, res) => {
      req.session.destroy(() => res.redirect("/admin/login"));
    });
    router.get("/", requireAdminAuth, async (req, res) => {
      try {
        const [totalRes, programRes, statusRes, recentRes] = await Promise.all([
          pool.query("SELECT COUNT(*) AS total FROM students"),
          pool.query(`SELECT program, COUNT(*) AS count FROM students GROUP BY program ORDER BY count DESC`),
          pool.query(`SELECT status, COUNT(*) AS count FROM students GROUP BY status`),
          pool.query(`SELECT id, child_name, program, status, enrolled_at FROM students ORDER BY enrolled_at DESC LIMIT 5`)
        ]);
        res.render("dashboard", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          total: parseInt(totalRes.rows[0].total, 10),
          byProgram: programRes.rows,
          byStatus: statusRes.rows,
          recent: recentRes.rows
        });
      } catch (err) {
        console.error("[ADMIN DASHBOARD]", err.message);
        res.status(500).send("Dashboard error: " + err.message);
      }
    });
    router.get("/students", requireAdminAuth, async (req, res) => {
      try {
        const search = sanitize(req.query.search || "");
        const program = sanitize(req.query.program || "");
        const status = sanitize(req.query.status || "");
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 15;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let p = 1;
        if (search) {
          conditions.push(`(child_name ILIKE $${p} OR parent_name ILIKE $${p} OR parent_email ILIKE $${p})`);
          params.push(`%${search}%`);
          p++;
        }
        if (program) {
          conditions.push(`program = $${p++}`);
          params.push(program);
        }
        if (status) {
          conditions.push(`status  = $${p++}`);
          params.push(status);
        }
        const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
        const [countRes, rowsRes] = await Promise.all([
          pool.query(`SELECT COUNT(*) AS total FROM students ${where}`, params),
          pool.query(
            `SELECT id, child_name, child_dob, program, shift, parent_name, parent_phone, status, enrolled_at
           FROM students ${where}
           ORDER BY enrolled_at DESC
           LIMIT $${p} OFFSET $${p + 1}`,
            [...params, limit, offset]
          )
        ]);
        const total = parseInt(countRes.rows[0].total, 10);
        res.render("students", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          students: rowsRes.rows,
          search,
          program,
          status,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          success: req.query.success || req.query.error || null
        });
      } catch (err) {
        console.error("[ADMIN STUDENTS]", err.message);
        res.status(500).send("Error loading students: " + err.message);
      }
    });
    router.get("/students/new", requireAdminAuth, (req, res) => {
      res.render("student-form", {
        nonce: res.locals.nonce,
        admin: req.session.adminUser,
        student: null,
        errors: [],
        formAction: "/admin/students",
        formTitle: "Add New Student"
      });
    });
    router.post("/students", requireAdminAuth, async (req, res) => {
      const { errors, data } = validateStudentForm(req.body);
      if (errors.length) {
        return res.render("student-form", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          student: data,
          errors,
          formAction: "/admin/students",
          formTitle: "Add New Student"
        });
      }
      try {
        await pool.query(
          `INSERT INTO students (
         child_name, child_dob, preferred_name, gender, home_address, languages_spoken,
         parent_name, parent_relationship, parent_phone, parent_email, employer, parent_work_phone,
         guardian2_name, guardian2_relationship, guardian2_phone, guardian2_email, guardian2_employer, guardian2_work_phone,
         pickup1_name, pickup1_relationship, pickup1_phone, pickup1_authorized,
         pickup2_name, pickup2_relationship, pickup2_phone, pickup2_authorized,
         pickup3_name, pickup3_relationship, pickup3_phone, pickup3_authorized,
         physician_name, physician_phone, physician_address, preferred_hospital, insurance_provider,
         food_allergies, environmental_allergies, chronic_conditions, regular_medications, sensory_notes,
         consent_photo_video, consent_social_media, consent_topical,
         classroom_assigned, lead_director, fee_received, deposit_received, billing_created, welcome_kit_issued,
         program, shift, emergency_contact, status, notes
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
         $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
         $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54
       )`,
          [
            data.child_name,
            data.child_dob,
            data.preferred_name,
            data.gender,
            data.home_address,
            data.languages_spoken,
            data.parent_name,
            data.parent_relationship,
            data.parent_phone,
            data.parent_email,
            data.employer,
            data.parent_work_phone,
            data.guardian2_name,
            data.guardian2_relationship,
            data.guardian2_phone,
            data.guardian2_email,
            data.guardian2_employer,
            data.guardian2_work_phone,
            data.pickup1_name,
            data.pickup1_relationship,
            data.pickup1_phone,
            data.pickup1_authorized,
            data.pickup2_name,
            data.pickup2_relationship,
            data.pickup2_phone,
            data.pickup2_authorized,
            data.pickup3_name,
            data.pickup3_relationship,
            data.pickup3_phone,
            data.pickup3_authorized,
            data.physician_name,
            data.physician_phone,
            data.physician_address,
            data.preferred_hospital,
            data.insurance_provider,
            data.food_allergies,
            data.environmental_allergies,
            data.chronic_conditions,
            data.regular_medications,
            data.sensory_notes,
            data.consent_photo_video,
            data.consent_social_media,
            data.consent_topical,
            data.classroom_assigned,
            data.lead_director,
            data.fee_received,
            data.deposit_received,
            data.billing_created,
            data.welcome_kit_issued,
            data.program,
            data.shift,
            data.emergency_contact,
            data.status,
            data.notes
          ]
        );
        res.redirect("/admin/students?success=added");
      } catch (err) {
        console.error("[ADMIN ADD STUDENT]", err.message);
        res.render("student-form", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          student: data,
          errors: ["Database error: " + err.message],
          formAction: "/admin/students",
          formTitle: "Add New Student"
        });
      }
    });
    router.get("/students/:id/edit", requireAdminAuth, async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.redirect("/admin/students");
      try {
        const result = await pool.query("SELECT * FROM students WHERE id = $1", [id]);
        if (!result.rows.length) return res.redirect("/admin/students");
        const student = result.rows[0];
        if (student.child_dob) {
          student.child_dob = new Date(student.child_dob).toISOString().split("T")[0];
        }
        res.render("student-form", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          student,
          errors: [],
          formAction: `/admin/students/${id}`,
          formTitle: "Edit Student Record"
        });
      } catch (err) {
        console.error("[ADMIN EDIT STUDENT]", err.message);
        res.redirect("/admin/students");
      }
    });
    router.post("/students/:id", requireAdminAuth, async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.redirect("/admin/students");
      const { errors, data } = validateStudentForm(req.body);
      if (errors.length) {
        return res.render("student-form", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          student: { ...data, id },
          errors,
          formAction: `/admin/students/${id}`,
          formTitle: "Edit Student Record"
        });
      }
      try {
        await pool.query(
          `UPDATE students SET
         child_name=$1, child_dob=$2, preferred_name=$3, gender=$4, home_address=$5, languages_spoken=$6,
         parent_name=$7, parent_relationship=$8, parent_phone=$9, parent_email=$10, employer=$11, parent_work_phone=$12,
         guardian2_name=$13, guardian2_relationship=$14, guardian2_phone=$15, guardian2_email=$16, guardian2_employer=$17, guardian2_work_phone=$18,
         pickup1_name=$19, pickup1_relationship=$20, pickup1_phone=$21, pickup1_authorized=$22,
         pickup2_name=$23, pickup2_relationship=$24, pickup2_phone=$25, pickup2_authorized=$26,
         pickup3_name=$27, pickup3_relationship=$28, pickup3_phone=$29, pickup3_authorized=$30,
         physician_name=$31, physician_phone=$32, physician_address=$33, preferred_hospital=$34, insurance_provider=$35,
         food_allergies=$36, environmental_allergies=$37, chronic_conditions=$38, regular_medications=$39, sensory_notes=$40,
         consent_photo_video=$41, consent_social_media=$42, consent_topical=$43,
         classroom_assigned=$44, lead_director=$45, fee_received=$46, deposit_received=$47, billing_created=$48, welcome_kit_issued=$49,
         program=$50, shift=$51, emergency_contact=$52, status=$53, notes=$54
       WHERE id=$55`,
          [
            data.child_name,
            data.child_dob,
            data.preferred_name,
            data.gender,
            data.home_address,
            data.languages_spoken,
            data.parent_name,
            data.parent_relationship,
            data.parent_phone,
            data.parent_email,
            data.employer,
            data.parent_work_phone,
            data.guardian2_name,
            data.guardian2_relationship,
            data.guardian2_phone,
            data.guardian2_email,
            data.guardian2_employer,
            data.guardian2_work_phone,
            data.pickup1_name,
            data.pickup1_relationship,
            data.pickup1_phone,
            data.pickup1_authorized,
            data.pickup2_name,
            data.pickup2_relationship,
            data.pickup2_phone,
            data.pickup2_authorized,
            data.pickup3_name,
            data.pickup3_relationship,
            data.pickup3_phone,
            data.pickup3_authorized,
            data.physician_name,
            data.physician_phone,
            data.physician_address,
            data.preferred_hospital,
            data.insurance_provider,
            data.food_allergies,
            data.environmental_allergies,
            data.chronic_conditions,
            data.regular_medications,
            data.sensory_notes,
            data.consent_photo_video,
            data.consent_social_media,
            data.consent_topical,
            data.classroom_assigned,
            data.lead_director,
            data.fee_received,
            data.deposit_received,
            data.billing_created,
            data.welcome_kit_issued,
            data.program,
            data.shift,
            data.emergency_contact,
            data.status,
            data.notes,
            id
          ]
        );
        res.redirect("/admin/students?success=updated");
      } catch (err) {
        console.error("[ADMIN UPDATE STUDENT]", err.message);
        res.render("student-form", {
          nonce: res.locals.nonce,
          admin: req.session.adminUser,
          student: { ...data, id },
          errors: ["Database error: " + err.message],
          formAction: `/admin/students/${id}`,
          formTitle: "Edit Student Record"
        });
      }
    });
    router.post("/students/:id/delete", requireAdminAuth, async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.redirect("/admin/students");
      try {
        await pool.query("DELETE FROM students WHERE id = $1", [id]);
        res.redirect("/admin/students?success=deleted");
      } catch (err) {
        console.error("[ADMIN DELETE STUDENT]", err.message);
        res.redirect("/admin/students?error=delete_failed");
      }
    });
    function validateStudentForm(body) {
      const data = {
        // Child Information
        child_name: sanitize(body.child_name || ""),
        child_dob: sanitize(body.child_dob || ""),
        preferred_name: sanitize(body.preferred_name || ""),
        gender: sanitize(body.gender || ""),
        home_address: sanitize(body.home_address || ""),
        languages_spoken: sanitize(body.languages_spoken || ""),
        // Parent / Guardian 1 Information (Primary contact)
        parent_name: sanitize(body.parent_name || ""),
        parent_relationship: sanitize(body.parent_relationship || ""),
        parent_phone: sanitize(body.parent_phone || ""),
        parent_email: sanitize(body.parent_email || ""),
        employer: sanitize(body.employer || ""),
        parent_work_phone: sanitize(body.parent_work_phone || ""),
        // Parent / Guardian 2 Information (Secondary contact)
        guardian2_name: sanitize(body.guardian2_name || ""),
        guardian2_relationship: sanitize(body.guardian2_relationship || ""),
        guardian2_phone: sanitize(body.guardian2_phone || ""),
        guardian2_email: sanitize(body.guardian2_email || ""),
        guardian2_employer: sanitize(body.guardian2_employer || ""),
        guardian2_work_phone: sanitize(body.guardian2_work_phone || ""),
        // Authorized Pick-Up & Emergency Contacts (other than parents)
        pickup1_name: sanitize(body.pickup1_name || ""),
        pickup1_relationship: sanitize(body.pickup1_relationship || ""),
        pickup1_phone: sanitize(body.pickup1_phone || ""),
        pickup1_authorized: toBool(body.pickup1_authorized),
        pickup2_name: sanitize(body.pickup2_name || ""),
        pickup2_relationship: sanitize(body.pickup2_relationship || ""),
        pickup2_phone: sanitize(body.pickup2_phone || ""),
        pickup2_authorized: toBool(body.pickup2_authorized),
        pickup3_name: sanitize(body.pickup3_name || ""),
        pickup3_relationship: sanitize(body.pickup3_relationship || ""),
        pickup3_phone: sanitize(body.pickup3_phone || ""),
        pickup3_authorized: toBool(body.pickup3_authorized),
        // Pediatrician & Medical Details
        physician_name: sanitize(body.physician_name || ""),
        physician_phone: sanitize(body.physician_phone || ""),
        physician_address: sanitize(body.physician_address || ""),
        preferred_hospital: sanitize(body.preferred_hospital || ""),
        insurance_provider: sanitize(body.insurance_provider || ""),
        // Health Profile
        food_allergies: sanitize(body.food_allergies || ""),
        environmental_allergies: sanitize(body.environmental_allergies || ""),
        chronic_conditions: sanitize(body.chronic_conditions || ""),
        regular_medications: sanitize(body.regular_medications || ""),
        sensory_notes: sanitize(body.sensory_notes || ""),
        // Consents & Permissions
        consent_photo_video: toBool(body.consent_photo_video),
        consent_social_media: toBool(body.consent_social_media),
        consent_topical: toBool(body.consent_topical),
        // Internal Intake Checklist (Admin use only)
        classroom_assigned: sanitize(body.classroom_assigned || ""),
        lead_director: sanitize(body.lead_director || ""),
        fee_received: toBool(body.fee_received),
        deposit_received: toBool(body.deposit_received),
        billing_created: toBool(body.billing_created),
        welcome_kit_issued: toBool(body.welcome_kit_issued),
        // System Fields
        program: sanitize(body.program || ""),
        shift: sanitize(body.shift || ""),
        emergency_contact: sanitize(body.emergency_contact || ""),
        status: sanitize(body.status || "active"),
        notes: sanitize(body.notes || "")
      };
      const errors = [];
      if (!data.child_name) errors.push("Child name is required.");
      if (!data.child_dob) errors.push("Date of birth is required.");
      if (!["montessori", "daycare", "afterschool"].includes(data.program))
        errors.push("Invalid program selected.");
      if (!["morning", "afternoon", "full-day"].includes(data.shift))
        errors.push("Invalid shift selected.");
      if (!data.parent_name) errors.push("Parent name is required.");
      if (!data.parent_phone) errors.push("Parent phone is required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parent_email))
        errors.push("Valid parent email is required.");
      if (!data.emergency_contact) errors.push("Emergency contact is required.");
      if (!["active", "inactive", "graduated"].includes(data.status))
        errors.push("Invalid status selected.");
      return { errors, data };
    }
    module.exports = router;
  }
});

// server.js
var require_server = __commonJS({
  "server.js"(exports, module) {
    "use strict";
    __require("dotenv").config();
    var express = __require("express");
    var path = __require("path");
    var helmet = __require("helmet");
    var rateLimit = __require("express-rate-limit");
    var crypto = __require("crypto");
    var session = __require("express-session");
    var pgSession = __require("connect-pg-simple")(session);
    var pool = require_connect();
    var adminRouter = require_adminRouter();
    var app = express();
    var PORT = process.env.PORT || 3e3;
    app.set("trust proxy", 1);
    var RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    var RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
    app.set("view engine", "ejs");
    app.set("views", [
      path.join(__dirname, "views"),
      path.join(__dirname, "admin", "views")
    ]);
    app.use((req, res, next) => {
      res.locals.nonce = crypto.randomBytes(16).toString("base64");
      next();
    });
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              (req, res) => `'nonce-${res.locals.nonce}'`,
              "'strict-dynamic'",
              "https://www.google.com/recaptcha/",
              "https://www.gstatic.com/recaptcha/",
              "https://www.google.com",
              "https://www.gstatic.com"
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://fonts.googleapis.com",
              "https://cdnjs.cloudflare.com",
              "https://www.gstatic.com"
            ],
            fontSrc: [
              "'self'",
              "https://fonts.gstatic.com",
              "https://cdnjs.cloudflare.com"
            ],
            frameSrc: [
              "'self'",
              "https://www.google.com/recaptcha/",
              "https://recaptcha.google.com",
              "https://www.google.com",
              "https://maps.googleapis.com"
            ],
            connectSrc: [
              "'self'",
              "https://www.google.com/recaptcha/",
              "https://www.google.com",
              "https://www.gstatic.com"
            ],
            imgSrc: [
              "'self'",
              "data:",
              "https://*"
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            // Clickjacking prevention (OWASP A05)
            frameAncestors: ["'none'"],
            // Enable HTTPS upgrade only in production
            ...true ? { upgradeInsecureRequests: [] } : {}
          }
        },
        // Referrer-Policy (OWASP A05 — information leakage)
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        // Disable COEP to avoid breaking Google Maps / Turnstile cross-origin loads
        crossOriginEmbedderPolicy: false
      })
    );
    app.use((req, res, next) => {
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()"
      );
      next();
    });
    app.use(express.json({ limit: "15kb" }));
    app.use(express.urlencoded({ extended: true, limit: "15kb" }));
    var formSubmitLimiter = rateLimit({
      windowMs: 15 * 60 * 1e3,
      // 15 minutes
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many submissions from this IP. Please try again in 15 minutes."
      }
    });
    app.use(express.static(path.join(__dirname, "public"), { index: false }));
    app.use(
      session({
        store: new pgSession({
          pool,
          tableName: "session",
          createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET || "uraan-dev-secret-change-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 24 * 60 * 60 * 1e3,
          // 24 hours
          httpOnly: true,
          secure: true,
          sameSite: "lax"
        },
        name: "uraan.sid"
      })
    );
    app.use("/admin", adminRouter);
    function redact(str) {
      if (!str || typeof str !== "string" || str.length === 0) return "[empty]";
      return str.slice(0, 2) + "***";
    }
    function sanitizeInput(input) {
      if (typeof input !== "string") return "";
      return input.replace(/<[^>]*>/g, "").replace(/[;'"\\]/g, (ch) => {
        switch (ch) {
          case ";":
            return " ";
          case "'":
            return "&#x27;";
          case '"':
            return "&quot;";
          case "\\":
            return "&#x5C;";
          default:
            return ch;
        }
      }).trim();
    }
    var VALIDATORS = {
      name: (v) => /^[a-zA-Z\s]{2,100}$/.test(v),
      phone: (v) => /^(?:\+92|92|0)?3\d{9}$|^\+?[0-9\s\-()]{7,20}$/.test(v),
      email: (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v),
      dob: (v) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
        const d = new Date(v);
        if (isNaN(d.getTime())) return false;
        const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1e3);
        return age >= 1 && age <= 15;
      },
      program: (v) => ["montessori", "daycare", "afterschool"].includes(v),
      shift: (v) => ["morning", "afternoon", "full-day"].includes(v)
    };
    function requireXHR(req, res, next) {
      if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Invalid request origin. CSRF protection active."
        });
      }
      next();
    }
    async function verifyCaptchaToken(token, ipAddress) {
      if (!token) return false;
      if (false) {
        return true;
      }
      try {
        const body = new URLSearchParams();
        body.append("secret", RECAPTCHA_SECRET_KEY);
        body.append("response", token);
        if (ipAddress) body.append("remoteip", ipAddress);
        const outcome = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body
        });
        const json = await outcome.json();
        if (!json.success) {
          console.warn("[reCAPTCHA] Verification failed error codes:", json["error-codes"] || json);
        }
        return json.success === true;
      } catch (err) {
        console.error("[reCAPTCHA] Verification network error:", err.message);
        return false;
      }
    }
    app.post("/api/admissions", requireXHR, formSubmitLimiter, async (req, res) => {
      const {
        childName,
        childDob,
        program,
        parentName,
        parentPhone,
        parentEmail,
        emergencyContact,
        shift,
        employer,
        captchaToken
      } = req.body;
      const isHuman = await verifyCaptchaToken(captchaToken, req.ip);
      if (!isHuman) {
        return res.status(400).json({
          success: false,
          message: "Security verification failed. Please complete the captcha challenge."
        });
      }
      const sChildName = sanitizeInput(childName);
      const sChildDob = sanitizeInput(childDob);
      const sProgram = sanitizeInput(program);
      const sParentName = sanitizeInput(parentName);
      const sParentPhone = sanitizeInput(parentPhone);
      const sParentEmail = sanitizeInput(parentEmail);
      const sEmergencyContact = sanitizeInput(emergencyContact);
      const sShift = sanitizeInput(shift);
      const sEmployer = sanitizeInput(employer);
      if (!VALIDATORS.name(sChildName))
        return res.status(400).json({ success: false, message: "Invalid child name. Only letters allowed." });
      if (!VALIDATORS.dob(sChildDob))
        return res.status(400).json({ success: false, message: "Invalid date of birth. Child must be between 1\u201315 years." });
      if (!VALIDATORS.program(sProgram))
        return res.status(400).json({ success: false, message: "Invalid program selection." });
      if (!VALIDATORS.name(sParentName))
        return res.status(400).json({ success: false, message: "Invalid parent name. Only letters allowed." });
      if (!VALIDATORS.phone(sParentPhone))
        return res.status(400).json({ success: false, message: "Invalid phone format (e.g. 03XXXXXXXXX)." });
      if (!VALIDATORS.email(sParentEmail))
        return res.status(400).json({ success: false, message: "Invalid email address." });
      if (!VALIDATORS.phone(sEmergencyContact))
        return res.status(400).json({ success: false, message: "Invalid emergency contact number." });
      if (!VALIDATORS.shift(sShift))
        return res.status(400).json({ success: false, message: "Invalid shift selection." });
      console.log(
        `[ADMISSIONS] Child: ${redact(sChildName)} | Parent: ${redact(sParentName)} | Phone: ${redact(sParentPhone)} | Program: ${sProgram} | Shift: ${sShift}`
      );
      return res.status(200).json({
        success: true,
        message: "Congratulations! Your application has been securely submitted. Our Registrar will contact you shortly to confirm your campus visit."
      });
    });
    app.post("/api/contact", requireXHR, formSubmitLimiter, async (req, res) => {
      const { name, email, phone, message, captchaToken } = req.body;
      const isHuman = await verifyCaptchaToken(captchaToken, req.ip);
      if (!isHuman) {
        return res.status(400).json({
          success: false,
          message: "Security verification failed. Please complete the captcha challenge."
        });
      }
      const sName = sanitizeInput(name);
      const sEmail = sanitizeInput(email);
      const sPhone = sanitizeInput(phone);
      const sMessage = sanitizeInput(message);
      if (!VALIDATORS.name(sName))
        return res.status(400).json({ success: false, message: "Invalid name. Only letters allowed." });
      if (!VALIDATORS.email(sEmail))
        return res.status(400).json({ success: false, message: "Invalid email address." });
      if (!VALIDATORS.phone(sPhone))
        return res.status(400).json({ success: false, message: "Invalid phone number." });
      if (!sMessage || sMessage.length < 5)
        return res.status(400).json({ success: false, message: "Message too short (minimum 5 characters)." });
      console.log(
        `[CONTACT] From: ${redact(sName)} | Email: ${redact(sEmail)} | Phone: ${redact(sPhone)}`
      );
      return res.status(200).json({
        success: true,
        message: "Your message was sent successfully. We will reply within 24 hours."
      });
    });
    app.post("/api/waitlist", requireXHR, formSubmitLimiter, (req, res) => {
      const raw = req.body || {};
      const sName = sanitizeInput(String(raw.name || ""));
      const sEmail = sanitizeInput(String(raw.email || ""));
      const sPhone = sanitizeInput(String(raw.phone || ""));
      if (!VALIDATORS.name(sName))
        return res.status(400).json({ success: false, message: "Invalid name. Only letters allowed." });
      if (!VALIDATORS.email(sEmail))
        return res.status(400).json({ success: false, message: "Invalid email address." });
      if (!VALIDATORS.phone(sPhone))
        return res.status(400).json({ success: false, message: "Invalid phone number." });
      console.log(
        `[WAITLIST] Registered: ${redact(sName)} | Email: ${redact(sEmail)} | Phone: ${redact(sPhone)}`
      );
      return res.status(200).json({
        success: true,
        message: "You're on the list! We'll WhatsApp you the moment enrollment opens."
      });
    });
    app.get("/", (req, res) => {
      res.render("index", {
        nonce: res.locals.nonce,
        siteKey: RECAPTCHA_SITE_KEY
      });
    });
    app.get("*", (req, res) => {
      res.redirect("/");
    });
    var os = __require("os");
    function getLANAddress() {
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.") && !name.toLowerCase().includes("vmware") && !name.toLowerCase().includes("virtualbox")) {
            return net.address;
          }
        }
      }
      return "localhost";
    }
    if (__require.main === module) {
      app.listen(PORT, "0.0.0.0", () => {
        const lanIP = getLANAddress();
        console.log("=============================================================");
        console.log("  URAAN DAYCARE & SCHOOL WEB PORTAL");
        console.log("  Campus: Karachi, Pakistan | Status: OWASP Hardened");
        console.log("-------------------------------------------------------------");
        console.log(`  LOCAL   \u2192 http://localhost:${PORT}`);
        console.log(`  NETWORK \u2192 http://${lanIP}:${PORT}`);
        console.log("=============================================================");
        console.log(`  Security: CSP nonce | CSRF guard | PII-redacted logs`);
        console.log(`  Architecture: EJS modular partials | ${PORT}`);
        console.log("=============================================================");
      });
    }
    module.exports = app;
  }
});

// _worker.js
var require_worker = __commonJS({
  "_worker.js"(exports, module) {
    var { httpServerHandler } = __require("cloudflare:node");
    var app = require_server();
    module.exports = {
      fetch: httpServerHandler(app)
    };
  }
});
export default require_worker();
