/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    authExpiresAt?: number;
    authIssuedAt?: number;
    userRole?: string;
  }
}