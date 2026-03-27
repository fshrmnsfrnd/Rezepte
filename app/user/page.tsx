'use client'
import Header from "@/components/Header"
import React, { useEffect, useState } from "react";
import Login from "@/components/Login"
import { useSession } from "@/lib/auth-client";

export default function UserAuthPage() {
    const {data: session} = useSession();

    return (
        <div>
            <Header />
            <div className="login-page">
                <Login />
            </div>
        </div>
    );
}
