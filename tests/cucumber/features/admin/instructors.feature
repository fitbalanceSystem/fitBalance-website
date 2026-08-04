@admin @instructors @sanity @regression
Feature: Admin - Instructors Management
  As an admin
  I want to manage instructors
  So that I can track their details and classes

  Background:
    Given I am logged in as admin
    And I am on the admin instructors page

  @sanity
  Scenario: Instructors table is displayed
    Then the instructors count is greater than zero

  @regression
  Scenario: Search instructors
    When I search instructors for "רות"
    Then the instructors count is greater than zero

  @regression
  Scenario: View instructor modal opens
    When I click view on the first instructor row
    Then the instructor view modal is open
