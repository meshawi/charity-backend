#!/usr/bin/env python3
"""
SuperAdmin Transfer Tool
========================
GUI tool to transfer the SuperAdmin flag to a new or existing user.
This is the ONLY way to change who the SuperAdmin is.

Requirements:
    pip install -r requirements.txt

Usage:
    python transfer_superadmin.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import mysql.connector
import bcrypt
import os
import re


def parse_env():
    """Read .env from the project root and return a dict of values."""
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"
    )
    config = {}
    if not os.path.exists(env_path):
        return config
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip()
    return config


def hash_password(plain_password):
    """Hash password using bcrypt (compatible with Node's bcryptjs)."""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


class SuperAdminTransferApp:
    def __init__(self, root):
        self.root = root
        self.root.title("SuperAdmin Transfer Tool")
        self.root.geometry("580x680")
        self.root.resizable(False, False)

        self.conn = None
        self.current_admin = None
        self.users_list = []
        self.env_config = parse_env()

        self._build_ui()

    # ── UI ────────────────────────────────────────────────

    def _build_ui(self):
        main = ttk.Frame(self.root, padding=20)
        main.pack(fill=tk.BOTH, expand=True)

        # ── Database Connection ──
        db_frame = ttk.LabelFrame(main, text="Database Connection", padding=10)
        db_frame.pack(fill=tk.X, pady=(0, 10))

        db_fields = [
            ("Host:", "db_host", self.env_config.get("DB_HOST", "localhost")),
            ("Port:", "db_port", self.env_config.get("DB_PORT", "3306")),
            ("Database:", "db_name", self.env_config.get("DB_NAME", "charity_database")),
            ("User:", "db_user", self.env_config.get("DB_USER", "charity_user")),
            ("Password:", "db_pass", self.env_config.get("DB_PASSWORD", "")),
        ]

        self.db_vars = {}
        for i, (label, key, default) in enumerate(db_fields):
            ttk.Label(db_frame, text=label).grid(row=i, column=0, sticky=tk.W, pady=2)
            var = tk.StringVar(value=default)
            self.db_vars[key] = var
            show = "*" if key == "db_pass" else ""
            ttk.Entry(db_frame, textvariable=var, width=40, show=show).grid(
                row=i, column=1, sticky=tk.EW, pady=2, padx=(5, 0)
            )
        db_frame.columnconfigure(1, weight=1)

        ttk.Button(db_frame, text="Connect", command=self._connect).grid(
            row=len(db_fields), column=0, columnspan=2, pady=(10, 0)
        )

        # ── Current SuperAdmin ──
        info_frame = ttk.LabelFrame(main, text="Current SuperAdmin", padding=10)
        info_frame.pack(fill=tk.X, pady=(0, 10))
        self.admin_info = ttk.Label(info_frame, text="Not connected", foreground="gray")
        self.admin_info.pack(anchor=tk.W)

        # ── Transfer Mode ──
        tf = ttk.LabelFrame(main, text="Transfer To", padding=10)
        tf.pack(fill=tk.X, pady=(0, 10))

        self.transfer_mode = tk.StringVar(value="existing")
        ttk.Radiobutton(
            tf, text="Existing User", variable=self.transfer_mode,
            value="existing", command=self._toggle_mode,
        ).grid(row=0, column=0, sticky=tk.W)
        ttk.Radiobutton(
            tf, text="New User", variable=self.transfer_mode,
            value="new", command=self._toggle_mode,
        ).grid(row=0, column=1, sticky=tk.W)

        # Existing user combo
        self.existing_frame = ttk.Frame(tf)
        self.existing_frame.grid(row=1, column=0, columnspan=2, sticky=tk.EW, pady=(10, 0))
        ttk.Label(self.existing_frame, text="Select User:").grid(row=0, column=0, sticky=tk.W)
        self.user_combo = ttk.Combobox(self.existing_frame, state="readonly", width=45)
        self.user_combo.grid(row=0, column=1, sticky=tk.EW, padx=(5, 0))
        self.existing_frame.columnconfigure(1, weight=1)

        # New user fields
        self.new_frame = ttk.Frame(tf)
        self.new_frame.grid(row=2, column=0, columnspan=2, sticky=tk.EW, pady=(10, 0))

        new_fields = [
            ("Name:", "new_name"),
            ("Email:", "new_email"),
            ("National ID (10 digits):", "new_nid"),
            ("Password:", "new_pass"),
        ]
        self.new_vars = {}
        for i, (label, key) in enumerate(new_fields):
            ttk.Label(self.new_frame, text=label).grid(row=i, column=0, sticky=tk.W, pady=2)
            var = tk.StringVar()
            self.new_vars[key] = var
            show = "*" if key == "new_pass" else ""
            ttk.Entry(self.new_frame, textvariable=var, width=40, show=show).grid(
                row=i, column=1, sticky=tk.EW, pady=2, padx=(5, 0)
            )
        self.new_frame.columnconfigure(1, weight=1)
        self.new_frame.grid_remove()

        # Transfer button
        self.transfer_btn = ttk.Button(
            main, text="Transfer SuperAdmin", command=self._transfer, state=tk.DISABLED
        )
        self.transfer_btn.pack(pady=10)

        # Status label
        self.status = ttk.Label(main, text="", foreground="gray")
        self.status.pack()

    # ── Logic ─────────────────────────────────────────────

    def _toggle_mode(self):
        if self.transfer_mode.get() == "existing":
            self.existing_frame.grid()
            self.new_frame.grid_remove()
        else:
            self.existing_frame.grid_remove()
            self.new_frame.grid()

    def _connect(self):
        try:
            self.conn = mysql.connector.connect(
                host=self.db_vars["db_host"].get(),
                port=int(self.db_vars["db_port"].get()),
                database=self.db_vars["db_name"].get(),
                user=self.db_vars["db_user"].get(),
                password=self.db_vars["db_pass"].get(),
                charset="utf8mb4",
            )
            cursor = self.conn.cursor(dictionary=True)

            # Current super admin
            cursor.execute(
                "SELECT id, email, name, nationalId FROM Users WHERE isSuperAdmin = 1"
            )
            admin = cursor.fetchone()

            if admin:
                self.current_admin = admin
                self.admin_info.config(
                    text=f"ID: {admin['id']}  |  {admin['name']}  |  {admin['email']}  |  NID: {admin['nationalId']}",
                    foreground="green",
                )
            else:
                self.admin_info.config(text="No SuperAdmin found!", foreground="red")

            # Load active non-super-admin users
            cursor.execute(
                "SELECT id, email, name FROM Users "
                "WHERE isSuperAdmin = 0 AND isActive = 1 ORDER BY name"
            )
            self.users_list = cursor.fetchall()
            self.user_combo["values"] = [
                f"{u['id']} - {u['name']} ({u['email']})" for u in self.users_list
            ]
            cursor.close()

            self.transfer_btn.config(state=tk.NORMAL)
            self.status.config(text="Connected successfully", foreground="green")
        except Exception as e:
            messagebox.showerror("Connection Error", str(e))
            self.status.config(text="Connection failed", foreground="red")

    def _transfer(self):
        if not self.conn or not self.current_admin:
            messagebox.showerror("Error", "Not connected or no current SuperAdmin found")
            return

        mode = self.transfer_mode.get()

        if mode == "existing":
            target_id, target_label = self._validate_existing()
            if target_id is None:
                return
        else:
            target_id = None
            target_label, user_data = self._validate_new()
            if target_label is None:
                return

        if not messagebox.askyesno(
            "Confirm Transfer",
            f"Transfer SuperAdmin from:\n  {self.current_admin['name']} ({self.current_admin['email']})\n\n"
            f"To:\n  {target_label}\n\nThis cannot be undone from the web UI.\nProceed?",
        ):
            return

        try:
            cursor = self.conn.cursor(dictionary=True)

            # Get admin role ID
            cursor.execute("SELECT id FROM Roles WHERE name = N'مدير النظام'")
            admin_role = cursor.fetchone()
            if not admin_role:
                messagebox.showerror("Error", "Admin role (مدير النظام) not found in database")
                cursor.close()
                return
            admin_role_id = admin_role["id"]

            if mode == "new":
                target_id = self._create_new_user(cursor, user_data, admin_role_id)
                if target_id is None:
                    cursor.close()
                    return
            else:
                # Set isSuperAdmin on existing target
                cursor.execute(
                    "UPDATE Users SET isSuperAdmin = 1, updatedAt = NOW() WHERE id = %s",
                    (target_id,),
                )
                # Ensure admin role is assigned
                cursor.execute(
                    "SELECT id FROM UserRoles WHERE userId = %s AND roleId = %s",
                    (target_id, admin_role_id),
                )
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO UserRoles (userId, roleId, createdAt, updatedAt) "
                        "VALUES (%s, %s, NOW(), NOW())",
                        (target_id, admin_role_id),
                    )

            # Remove super admin flag from current admin
            cursor.execute(
                "UPDATE Users SET isSuperAdmin = 0, updatedAt = NOW() WHERE id = %s",
                (self.current_admin["id"],),
            )

            self.conn.commit()
            cursor.close()

            messagebox.showinfo(
                "Success",
                "SuperAdmin transferred successfully!\nRestart the backend for changes to take effect.",
            )
            self._connect()  # Refresh display

        except Exception as e:
            self.conn.rollback()
            messagebox.showerror("Error", f"Transfer failed:\n{e}")

    # ── Validation helpers ────────────────────────────────

    def _validate_existing(self):
        idx = self.user_combo.current()
        if idx < 0:
            messagebox.showwarning("Warning", "Please select a user")
            return None, None
        target = self.users_list[idx]
        return target["id"], f"{target['name']} ({target['email']})"

    def _validate_new(self):
        name = self.new_vars["new_name"].get().strip()
        email = self.new_vars["new_email"].get().strip()
        nid = self.new_vars["new_nid"].get().strip()
        password = self.new_vars["new_pass"].get()

        if not all([name, email, nid, password]):
            messagebox.showwarning("Warning", "All fields are required")
            return None, None

        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            messagebox.showwarning("Warning", "Invalid email format")
            return None, None

        if len(nid) != 10 or not nid.isdigit():
            messagebox.showwarning("Warning", "National ID must be exactly 10 digits")
            return None, None

        if len(password) < 6:
            messagebox.showwarning("Warning", "Password must be at least 6 characters")
            return None, None

        return f"{name} ({email})", {"name": name, "email": email, "nid": nid, "password": password}

    def _create_new_user(self, cursor, data, admin_role_id):
        """Insert a new user and assign the admin role. Returns user ID or None."""
        cursor.execute(
            "SELECT id FROM Users WHERE email = %s OR nationalId = %s",
            (data["email"], data["nid"]),
        )
        if cursor.fetchone():
            messagebox.showerror("Error", "Email or National ID already exists")
            return None

        hashed = hash_password(data["password"])
        cursor.execute(
            "INSERT INTO Users (email, nationalId, password, name, isActive, isSuperAdmin, createdAt, updatedAt) "
            "VALUES (%s, %s, %s, %s, 1, 1, NOW(), NOW())",
            (data["email"], data["nid"], hashed, data["name"]),
        )
        new_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO UserRoles (userId, roleId, createdAt, updatedAt) "
            "VALUES (%s, %s, NOW(), NOW())",
            (new_id, admin_role_id),
        )
        return new_id

    def on_close(self):
        if self.conn:
            try:
                self.conn.close()
            except Exception:
                pass
        self.root.destroy()


def main():
    root = tk.Tk()
    app = SuperAdminTransferApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()


if __name__ == "__main__":
    main()
