Feature: Login
  As a registered user
  I want to log in to my personal area
  So that I can access my account

  Background:
    Given I am on the login page

  Scenario: Successful login as customer
    When I select role "customer"
    And I enter email "test.customer@fitbalance.co.il" and password "Customer123!"
    And I click the login button
    Then I am redirected to the customer dashboard

  Scenario: Login with invalid credentials
    When I select role "customer"
    And I enter email "wrong@email.com" and password "WrongPass!"
    And I click the login button
    Then an error message is displayed

  Scenario: Forgot password - submit request
    When I click the forgot password link
    And I enter recovery email "test.customer@fitbalance.co.il"
    And I submit the forgot password form
    Then a confirmation message is displayed
