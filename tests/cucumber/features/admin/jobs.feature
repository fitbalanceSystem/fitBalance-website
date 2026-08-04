@admin @jobs @sanity @regression
Feature: Admin - Automated Jobs
  As an admin
  I want to view and run automated jobs
  So that I can manage batch processes

  Background:
    Given I am logged in as admin
    And I am on the admin jobs page

  @sanity
  Scenario: Jobs table is loaded
    Then the jobs table contains at least one row

  @regression
  Scenario: Refresh jobs list
    When I click the refresh jobs button
    Then the jobs table contains at least one row
