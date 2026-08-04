@admin @dashboard @sanity @regression
Feature: Admin - Dashboard
  As an admin
  I want to see the main dashboard
  So that I can monitor the studio at a glance

  Background:
    Given I am logged in as admin
    And I am on the admin dashboard

  @sanity
  Scenario: Dashboard KPIs are loaded
    Then all KPI cards display a numeric value

  @regression
  Scenario: Birthday list widget is visible
    Then the birthday list widget is displayed

  @regression
  Scenario: Date banner shows today's date
    Then the date banner contains the current year
